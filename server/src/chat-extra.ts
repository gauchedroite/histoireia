import { Request, Response } from 'express';
import fs from 'fs-extra';
import path from 'path';
import { assetsPath, extraPath, lookupPath } from './path-names';
import { LLMConfig } from './chat-interfaces';


interface Extra {
    prompt: string
    json_schema: object
}

export const chatExtra = async (req: Request, res: Response) => {
    const gameid = req.params.gameid;
    const extraid = req.params.extraid;
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
        const llm = llmList.find((one: any) => one.id == llmid) as unknown as LLMConfig
        const api = llm.provider
        const model = llm.model

        let extra_Path = path.join(extraPath, `${extraid}.json`)
        const extraContent = await fs.readFile(extra_Path, "utf8");
        const extra = JSON.parse(extraContent) as Extra;

        //
        messages.push({
            role: "user",
            content: extra.prompt
        })
        const json_schema = extra.json_schema

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
                response_format: {
                    type: "json_schema",
                    json_schema
                }
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error(`POST /chat/${gameid}/${extraid}`, error);
            res.status(response.status).json({ hasError: true, message: "Impossible de poursuivre l'histoire" });
            return
        }

        const json = await response.json()
        const content = json.choices[0]?.message?.content || "{}";
        const completion = JSON.parse(content)

        console.log(`POST /chat/${gameid}/${extraid}`);
        res.json(completion);
    }
    catch (error) {
        console.error(`POST /chat/${gameid}/${extraid}`, error);
        res.status(500).json({ hasError: true, message: "Erreur interne" });
    }
}
