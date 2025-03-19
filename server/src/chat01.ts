import { Request, Response } from 'express';
import fs from 'fs-extra';
import path from 'path';
import { assetsPath, lookupPath } from './path-names';


export const chat01 = async (req: Request, res: Response) => {
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


        // To switch between ollama and openai
        let endpoint = "http://192.168.50.199:11434/v1/chat/completions"
        let api_key = null
        //
        if (api == "openai") {
            endpoint = "https://api.openai.com/v1/chat/completions"
            api_key = process.env.OPENAI_API_KEY
        }

        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${api_key}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model,
                messages,
                stream: true
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error(`POST /chat/${gameid}`, error);
            res.status(response.status).json({ hasError: true, message: "Impossible de poursuivre l'histoire" });
            return
        }

        // Headers for streaming
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        const reader = response.body!.getReader();
        const decoder = new TextDecoder('utf-8');

        function stringToHex(str: string) {
            let hex = "";
            for (let i = 0; i < str.length; i++) {
                hex += str.charCodeAt(i).toString(16).padStart(2, "0") + " ";
            }
            return hex;
        }

        const processStream = async () => {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const dataString = decoder.decode(value, { stream: true });
                const lines = dataString.split('\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const message = line.replace(/^data: /, '');
                        if (message == "[DONE]")
                            break;

                        try {
                            const parsed = JSON.parse(message);
                            if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta.content) {
                                const content = parsed.choices[0].delta.content;
                                res.write(content);
                            }
                        }
                        catch (error) {
                            console.error(`POST /chat/${gameid} Error parsing JSON:`, error);
                        }
                    }
                }
            }
            res.write(" ")
            res.end();
        };

        processStream().catch(error => {
            console.error(`POST /chat/${gameid}`, error);
            res.status(500).json({ hasError: true, message: "Erreur interne en traitant le stream" });
        });
    }
    catch (error) {
        console.error(`POST /chat/${gameid}`, error);
        res.status(500).json({ hasError: true, message: "Erreur interne" });
    }
}