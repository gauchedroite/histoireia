import { Request, Response } from 'express';
import fs from 'fs-extra';
import path from 'path';
import { assetsPath, lookupPath, toolsPath } from './path-names';


interface Man {
    endpoint: string
    api_key: string | null
    model: string
    gameid: string
    tools: object[]
    res: Response
}

export const chat04 = async (req: Request, res: Response) => {
    const gameid = req.params.gameid;
    try {
        const messages = req.body as any

        let gameid_Path = path.join(assetsPath, gameid)
        const metadataPath = path.join(gameid_Path, "metadata.json");
        const metaContent = await fs.readFile(metadataPath, "utf8");
        const game = JSON.parse(metaContent);

        const llmid = game.llmid
        let llm_Path = path.join(lookupPath, "llm.json")
        const llmContent = await fs.readFile(llm_Path, "utf8")
        const llmList = JSON.parse(llmContent) as []
        const llm = llmList.find((one: any) => one.id == llmid) as any
        const api = llm.value1
        const model = llm.value2

        // To provide additional context to api calls
        const man = <Man>{};
        man.res = res
        man.model = model
        man.gameid = gameid;
        man.tools = []

        const toolPath = path.join(toolsPath, "roll_pbta.json");
        const toolContent = await fs.readFile(toolPath, "utf8");
        man.tools.push(JSON.parse(toolContent))

        // To switch between ollama and openai
        man.endpoint = "http://192.168.50.199:11434/v1/chat/completions"
        man.api_key = null
        //
        if (api == "openai") {
            man.endpoint = "https://api.openai.com/v1/chat/completions"
            man.api_key = process.env.OPENAI_API_KEY!
        }

        // Configuration de la requête vers OpenAI
        const requestBody = {
            model: man.model,
            messages,
            stream: true,
        };
        if (man.tools.length) {
            (requestBody as any).tools = man.tools;
            (requestBody as any).tool_choice = "auto"
        }

        // Headers for streaming back to client
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        let pendingMessages = messages;

        const openAIStream = await fetch(man.endpoint, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${man.api_key}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });

        if (!openAIStream.body) throw new Error("No stream body received");

        const reader = openAIStream.body.getReader();
        const decoder = new TextDecoder();
        let currentToolCall: any = null;
        let currentToolCalls: any[] = [];
        let toolCallBuffer = '';

        // Lecture du stream
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim().length > 0);

                for (const line of lines) {
                    // Format des chunks OpenAI: "data: {json}" ou "data: [DONE]"
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);

                        if (data === '[DONE]') {
                            res.write('data: [DONE]\n\n');
                            //res.write(' ');
                            continue;
                        }

                        try {
                            const jsonData = JSON.parse(data);
                            const delta = jsonData.choices[0]?.delta;

                            // Gestion des tool_calls
                            if (delta && delta.tool_calls) {
                                const toolCalls = delta.tool_calls;

                                for (const toolCall of toolCalls) {
                                    const index = toolCall.index;

                                    // Initialiser un nouvel appel d'outil si nécessaire
                                    if (!currentToolCalls[index]) {
                                        currentToolCalls[index] = {
                                            id: toolCall.id || null,
                                            type: toolCall.type || null,
                                            function: {
                                                name: '',
                                                arguments: ''
                                            }
                                        };
                                    }

                                    // Mettre à jour l'ID et le type si présents
                                    if (toolCall.id) {
                                        currentToolCalls[index].id = toolCall.id;
                                    }

                                    if (toolCall.type) {
                                        currentToolCalls[index].type = toolCall.type;
                                    }

                                    // Mettre à jour le nom de la fonction et les arguments si présents
                                    if (toolCall.function) {
                                        if (toolCall.function.name) {
                                            currentToolCalls[index].function.name = toolCall.function.name;
                                        }

                                        if (toolCall.function.arguments) {
                                            currentToolCalls[index].function.arguments += toolCall.function.arguments;

                                            // Essayer de parser les arguments JSON complets
                                            try {
                                                const args = JSON.parse(currentToolCalls[index].function.arguments);
                                                // Si nous arrivons ici, le JSON est complet et valide
                                            } catch (e) {
                                                // Le JSON n'est pas encore complet, continuer à accumuler
                                            }
                                        }
                                    }
                                }

                                // Inclure les tool_calls mis à jour dans la réponse
                                jsonData.choices[0].delta.tool_calls = currentToolCalls.map((call, idx) => {
                                    // Ne renvoyer que les changements pour cet index spécifique
                                    const changedCall = toolCalls.find((tc: any) => tc.index === idx);
                                    if (!changedCall) return null;

                                    const result: any = { index: idx };

                                    if (changedCall.id && !currentToolCalls[idx].id_sent) {
                                        result.id = currentToolCalls[idx].id;
                                        currentToolCalls[idx].id_sent = true;
                                    }

                                    if (changedCall.type && !currentToolCalls[idx].type_sent) {
                                        result.type = currentToolCalls[idx].type;
                                        currentToolCalls[idx].type_sent = true;
                                    }

                                    if (changedCall.function) {
                                        result.function = {};

                                        if (changedCall.function.name && !currentToolCalls[idx].function_name_sent) {
                                            result.function.name = currentToolCalls[idx].function.name;
                                            currentToolCalls[idx].function_name_sent = true;
                                        }

                                        if (changedCall.function.arguments) {
                                            result.function.arguments = changedCall.function.arguments;
                                        }
                                    }

                                    return result;
                                }).filter(Boolean);
                            }

                            res.write(`data: ${JSON.stringify(jsonData)}\n\n`);
                            //res.write(delta.content)
                        }
                        catch (error) {
                            console.error('Error parsing JSON from OpenAI stream:', error);
                            console.error('Problematic chunk:', data);
                            // Continuer à traiter les autres chunks même si celui-ci est problématique
                        }
                    }
                }
            }
        }
        catch (error) {
            console.error('Error processing stream:', error);
        }
        finally {
            res.end();
        }
    }
    catch (error) {
        console.error(`POST /chat/${gameid}`, error);
        res.status(500).json({ hasError: true, message: "Erreur interne" });
    }
}
