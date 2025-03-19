import { Request, Response } from 'express';
import fs from 'fs-extra';
import path from 'path';
import { rollPbta, resolvePbta } from './server_tools';
import { assetsPath, lookupPath, toolsPath } from './path-names';


interface Man {
    endpoint: string
    api_key: string | null
    model: string
    gameid: string
    tools: object[]
    res: Response
}

export const chat02 = async (req: Request, res: Response) => {
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

        // Headers for streaming back to client
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        let conversation = [...messages];
        let isStreaming = true;

        while (isStreaming) {
            const stream = await fetchOpenAI(man, conversation, true);
            if (stream == null) return;

            let collectedText = "";
            let toolCalls: any[] = [];

            for await (const chunk of parseOpenAIStream(stream)) {
                // Stop streaming pour exécuter les tool calls
                if (chunk.tool_calls) {
                    toolCalls.push(...chunk.tool_calls);
                    break;
                }

                // Send to UI
                const content = chunk.content
                if (content) {
                    collectedText += content;
                    res.write(content);
                }
            }

            // Exécuter les tool calls si nécessaires
            // Les réponses des tolls sont ajoutées à la conversation
            await executeTools(toolCalls, conversation)

            if (toolCalls.length == 0) {
                // Terminé sans demander de tool. Fin du streaming
                isStreaming = false;
            }
        }

        res.write(" ")
        res.end();
    }
    catch (error) {
        console.error(`POST /chat/${gameid}`, error);
        res.status(500).json({ hasError: true, message: "Erreur interne" });
    }
}


// Appeler OpenAI(like) api
async function fetchOpenAI(man: Man, messages: any[], stream = false) {
    const response = await fetch(man.endpoint, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${man.api_key}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: man.model,
            messages,
            tools: man.tools,
            stream
        })
    });

    if (!response.ok) {
        const error = await response.text();
        console.error(`POST /chat/${man.gameid}`, error);
        man.res.status(response.status).json({ hasError: true, message: `Impossible de poursuivre l'histoire. [${error}]` });
        return null
    }

    return response.body!;
}

// Lire les streams ligne par ligne
async function* parseOpenAIStream(stream: ReadableStream<Uint8Array>) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    let buffer = ""; // Stocker les morceaux de JSON
    let toolCalls: { [key: string]: any } = {}; // Stocke les tool_calls incomplets
    let toolId: string | null = null

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value);
        const lines = buffer.split("\n").filter(line => line.startsWith("data: "));

        for (const line of lines) {
            const json = line.replace("data: ", "").trim();
            if (json == "[DONE]") break; //return;

            try {
                const chunk = JSON.parse(json);
                const delta = chunk.choices?.[0]?.delta;

                if (!delta) continue;

                //console.log("----\nDELTA", delta)

                // Reconstruction des tool calls
                if (delta.tool_calls) {
                    //console.log("DELTA.TOOL_CALLS", delta.tool_calls)
                    for (const partialCall of delta.tool_calls) {
                        //const id = partialCall.id || Object.keys(toolCalls).find(key => !toolCalls[key].complete);
                        const id = partialCall.id || toolId;
                        //console.log("PARTIAL CALL", id, partialCall)

                        if (partialCall.id) {
                            // Nouveau tool_call détecté
                            toolId = partialCall.id
                            toolCalls[toolId!] = {
                                id: toolId,
                                function: {
                                    name: partialCall.function.name,
                                    arguments: ""
                                }
                            };
                        }
                        else if (partialCall.function?.arguments) {
                            // Ajout de nouveaux morceaux de paramètres
                            toolCalls[id].function.arguments += partialCall.function.arguments;
                        }

                        //console.log(toolCalls[id])
                    }
                    continue; // On attend la fin du tool_call
                }

                // Envoi du texte à l'interface utilisateur
                if (delta.content) {
                    yield { content: delta.content };
                }
            }
            catch (err) {
                console.error("Erreur parsing JSON OpenAI:", err);
            }
        }

        // Nettoyage du buffer
        buffer = buffer.includes("\n") ? buffer.split("\n").pop() || "" : buffer;
    }

    // Une fois tout le flux reçu, on envoie les tool_calls complets
    for (const toolCall of Object.values(toolCalls)) {
        yield { tool_calls: [toolCall] };
    }
}

async function executeTools(toolCalls: any[], conversation: any[]) {
    console.log("TOOLS", toolCalls)

    // Exécuter les tool calls si nécessaires
    for (const toolCall of toolCalls) {
        console.log("TOOL CALL", toolCall)
        const funName = toolCall.function.name
        const funArgs = JSON.parse(toolCall.function.arguments)

        let toolResult;
        if (funName == "roll_pbta") {
            console.log("roll_pbta", funArgs.modifier)
            toolResult = rollPbta(funArgs.modifier);
        }
        else if (funName == "resolve_pbta") {
            toolResult = resolvePbta(funArgs.roll);
        }

        // On ajoute la réponse du tool à la conversation et on relance OpenAI
        conversation.push({
            role: "tool",
            name: funName,
            content: JSON.stringify(toolResult)
        });
    }
}