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

export const chat03 = async (req: Request, res: Response) => {
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
        //man.tools.push(JSON.parse(toolContent))

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

        let pendingMessages = messages;

        console.log("================\n")
        while (true) {
            console.log(man.endpoint, messages)
            const openAIStream = await fetch(man.endpoint, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${man.api_key}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: man.model,
                    messages,
                    stream: true,
                    tools: man.tools
                })
            });

            if (!openAIStream.body) throw new Error("No stream body received");

            const reader = openAIStream.body.getReader();
            let partialData = "";
            let toolCallsBuffer: Record<string, any> = {};
            let hasToolCalls = false;
            let currentToolCallId: string | null = null;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = new TextDecoder().decode(value);
                partialData += chunk; // Ajouter au buffer

                // Découper en lignes complètes
                const lines = partialData.split("\n").filter(line => line.startsWith("data: "));

                // Garder le dernier morceau incomplet
                if (!partialData.endsWith("\n")) {
                    partialData = lines.pop() || "";
                }
                else {
                    partialData = "";
                }

                for (let line of lines) {
                    const jsonStr = line.replace("data: ", "").trim();
                    if (jsonStr === "[DONE]") {
                        res.write(" ");
                        continue;
                    }

                    try {
                        const data = JSON.parse(jsonStr);

                        if (data.choices) {
                            for (const choice of data.choices) {
                                const delta = choice.delta;

                                // Diffuser le texte immédiatement
                                if (delta?.content) {
                                    res.write(delta.content);
                                }

                                // Reconstruction des tool calls en delta
                                if (delta?.tool_calls) {
                                    hasToolCalls = true;

                                    for (const toolCall of delta.tool_calls) {
                                        if (toolCall.index !== undefined) {
                                            currentToolCallId = toolCall.index.toString();

                                            if (!toolCallsBuffer[currentToolCallId!]) {
                                                toolCallsBuffer[currentToolCallId!] = {
                                                    id: toolCall.id,
                                                    function: { name: "", arguments: "" }
                                                };
                                            }
                                        }

                                        if (toolCall.function?.name) {
                                            toolCallsBuffer[currentToolCallId!].function.name = toolCall.function.name;
                                        }

                                        if (toolCall.function?.arguments) {
                                            toolCallsBuffer[currentToolCallId!].function.arguments += toolCall.function.arguments;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    catch (error) {
                        continue;
                    }
                }

                res.write(""); // Force l'envoi immédiat
            }

            if (!hasToolCalls) return;

            // Exécuter les tool calls
            const toolResponses = await executeToolCalls(Object.values(toolCallsBuffer));

            // Ajouter les réponses des outils et refaire une requête
            pendingMessages.push(...toolResponses);
        }
        res.end()
    }
    catch (error) {
        console.error(`POST /chat/${gameid}`, error);
        res.status(500).json({ hasError: true, message: "Erreur interne" });
    }
}

async function executeToolCalls(toolCalls: any[]): Promise<any[]> {
    const results = [];
    for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        let toolResponse;
        if (functionName == "roll_pbta") {
            const result = rollPbta(functionArgs);
            console.log("roll_pbta", functionArgs, result.roll)
            toolResponse = { role: "tool", content: JSON.stringify(result), name: functionName };
        }
        else if (functionName == "resolve_pbta") {
            const result = resolvePbta(functionArgs);
            console.log("resolve_pbta", functionArgs, result.outcome)
            toolResponse = { role: "tool", content: JSON.stringify(result), name: functionName };
        }

        results.push(toolResponse);
    }
    return results;
}