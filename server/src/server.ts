import express, { Request, Response, Application, NextFunction } from 'express';
import { Readable } from 'stream';
import bodyParser from 'body-parser';
import fs from 'fs-extra';
import path from 'path';
import { createFunName } from './funny-name';


interface GameDefinition {
    code: string
    title: string
    bg_url: string
    bg_image: string | null
    prompt: string
    llmid: number
}

interface Message {
    role: string,
    content: string
}

const app = express();
const port = 9340;


// Set paths
const publicPath = path.join(__dirname, "../../public");
const assetsPath = path.join(__dirname, "../../public/assets");
const lookupPath = path.join(__dirname, "../../public/lookup");


// The src and webfonts folders are served by Caddy because
// they are referred to as /client/src and /webfonts
// which are outside /histoireia, our default virtual folder
//
//app.use("/client/src", express.static(path.join(__dirname, "../../client/src")));
//app.use("/webfonts", express.static(path.join(__dirname, "../../public/webfonts")));



// Middleware to print the URI of all requests
app.use((req, res, next) => {
    //console.log(`Requested URI: ${req.originalUrl}`);
    next();
});

  
// Middleware to configure cache settings for /data endpoint
const noCache: express.RequestHandler = (_req, res, next) => {
    console.log(`Accessing /data endpoint at ${new Date().toISOString()}`);
    
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.set("Surrogate-Control", "no-store");

    next();
};
//app.use("/story", noCache);

// Configure access to static files
app.use("/story", express.static(assetsPath));

// Configure express default virtual folder
app.use(express.static(publicPath));

// Middleware to parse JSON bodies
app.use(bodyParser.json({ limit: "50mb" }));



// List stories
app.get("/stories", async (req: Request, res: Response) => {
    try {
        const entries = await fs.readdir(assetsPath, { withFileTypes: true });
        const index = [];

        for (const entry of entries) {
            if (entry.isDirectory()) {
                const folderPath = path.join(assetsPath, entry.name);

                try {
                    const metadataPath = path.join(folderPath, "metadata.json");
                    const fileContent = await fs.readFile(metadataPath, "utf8");
                    const data = JSON.parse(fileContent);

                    if (data.code && data.title) {
                        index.push({
                            code: data.code,
                            title: data.title,
                            bg_image: data.bg_image,
                            bg_url: (data.bg_image ? `assets/billy/${data.bg_image}` : ""),
                            promptfile: `${data.code}.txt`
                        });
                    }
                }
                catch (err) {
                    console.error(`GET /stories Error: processing folder ${entry.name}`, err);
                    res.status(500).json({ hasError: true, message: `Impossible de trouver le livre '${entry.name}'` });
                    return;
                }
            }
        }

        index.sort((a, b) => (a.title).localeCompare(b.title))

        res.json(index);
    }
    catch (err) {
        console.error(`GET /stories Error: scanning directory`, err);
        res.status(500).json({ hasError: true, message: "Impossible d'obtenir la liste de livre!" });
    }
});

app.get("/stories/:gameid", async (req: Request, res: Response) => {
    let gameid = req.params.gameid;
    let gameid_Path = path.join(assetsPath, gameid)

    try {
        const metadataPath = path.join(gameid_Path, "metadata.json");
        const metaContent = await fs.readFile(metadataPath, "utf8");
        const data = JSON.parse(metaContent);

        const promptPath = path.join(gameid_Path, "prompt.txt");
        const prompt = await fs.readFile(promptPath, "utf8");

        const _game_definition: GameDefinition = {
                code: data.code,
                title: data.title,
                bg_image: data.bg_image,
                bg_url: (data.bg_image ? `assets/${gameid}/${data.bg_image}` : ""),
                prompt,
                llmid: data.llmid ?? 1
        }

        console.log(`GET /stories/${gameid}`, _game_definition)
        res.json(_game_definition);
    }
    catch (err) {
        console.error(`GET /stories/${gameid}`, err);
        res.status(500).json({ hasError: true, message: "Impossible d'ouvrir le livre!" });
    }
});

// Update a story
app.put("/stories/:gameid", async (req: Request, res: Response) => {
    const { title, bg_image, prompt, llmid } = req.body as GameDefinition
    let gameid = req.params.gameid;
    let gameid_Path = path.join(assetsPath, gameid)

    if (gameid == "new") {
        while (true) {
            gameid = createFunName()
            gameid_Path = path.join(assetsPath, gameid)
            
            if (!fs.existsSync(gameid_Path))
                break

            await new Promise(resolve => setTimeout(resolve, 1000))
        }

        await fs.mkdir(gameid_Path)
    }

    try {
        const game = <GameDefinition>{ code: gameid, title, bg_image, llmid: llmid ?? 1 }
    
        const gameid_jsonPath = path.join(gameid_Path, "metadata.json");
        const gameid_txtPath = path.join(gameid_Path, "prompt.txt");
    
        await fs.writeFile(gameid_jsonPath, JSON.stringify(game));
        await fs.writeFile(gameid_txtPath, prompt);

        console.log(`PUT /stories/${gameid}`);
        res.json({ gameid });
    }
    catch (err) {
        console.error(`PUT /stories/${gameid}`, err);
        res.status(500).json({ hasError: true, message: "Impossible de mettre à jour le livre!" });
    }
});

// Delete a story
app.delete("/stories/:gameid", async (req: Request, res: Response) => {
    const gameid = req.params.gameid;
    const gameid_Path = path.join(assetsPath, gameid)

    try {
        const files = await fs.readdir(gameid_Path);

        // Delete each file in folder
       for (const file of files) {
           const filePath = path.join(gameid_Path, file);
           await fs.unlink(filePath);
       }

        // After deleting all files, remove the folder
        await fs.rmdir(gameid_Path);
        console.log(`DELETE /stories/${gameid}`);
        res.status(204).end();
    }
    catch (err) {
        console.error(`DELETE /stories/${gameid}`, err);
        res.status(500).json({ hasError: true, message: "Impossible d'effacer le livre!" });
    }
});

// Execute story prompt
app.post("/stories/:gameid/chat", async (req: Request, res: Response) => {
    const gameid = req.params.gameid;
    try {
        const query = req.body as any

        let gameid_Path = path.join(assetsPath, gameid)
        const metadataPath = path.join(gameid_Path, "metadata.json");
        const metaContent = await fs.readFile(metadataPath, "utf8");
        const game = JSON.parse(metaContent);

        const llmid = game.llmid
        let llm_Path = path.join(lookupPath, "llm.json")
        const llmContent = await fs.readFile(llm_Path, "utf8")
        const llmList = JSON.parse(llmContent) as []
        const llm = llmList.find((one: any) => one.id == llmid) as any
        console.log("LLM **", llm)
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

        query.model = model
        console.log("QUERY **", query)

        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${api_key}`,
                "Content-Type": "application/json"
             },
            body: JSON.stringify(query) 
        });

        if (!response.ok) {
            const error = await response.text();
            console.error(`POST /stories/${gameid}/chat`, error);
            res.status(response.status).json({ hasError: true, message: "Impossible de poursuivre l'histoire" });
            return
        }

        // Headers for streaming
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        const reader = response.body!.getReader();
        const decoder = new TextDecoder('utf-8');
    
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
                            console.error(`POST /stories/${gameid}/chat Error parsing JSON:`, error);
                        }
                    }
                }
            }
            res.end();
        };
    
        processStream().catch(error => {
            console.error(`POST /stories/${gameid}/chat`, error);
            res.status(500).json({ hasError: true, message: "Erreur interne en traitant le stream" });
        });
    }
    catch (error) {
        console.error(`POST /stories/${gameid}/chat`, error);
        res.status(500).json({ hasError: true, message: "Erreur interne" });
    }
});



app.post("/upload-face", async (req: Request, res: Response) => {
    const { filename: fileName, image } = req.body;
    const filePath = path.join(publicPath, fileName);
    const base64Data = image.replace(/^data:image\/png;base64,/, "");

    try {
        await fs.writeFile(filePath, base64Data, "base64");
        console.log('Successfully saved face');
        res.status(200).send("File uploaded and saved as " + fileName);
    }
    catch (error) {
        console.error("Error saving png file", error);
        res.status(500).send("Failed to upload file: " + (error as Error).message);
    }
});




// Start server
app.listen(port, "0.0.0.0", () => {
    console.log(`Server is running on http://0.0.0.0:${port}`);
});
