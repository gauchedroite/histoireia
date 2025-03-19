import express, { Request, Response, Application, NextFunction } from 'express';
import bodyParser from 'body-parser';
import fs from 'fs-extra';
import path from 'path';
import { createFunName } from './funny-name';
import { resolvePbta, rollPbta } from './server_tools';


interface GameDefinition {
    code: string
    title: string
    bg_url: string
    bg_image: string | null
    prompt: string
    llmid: number
    extra?: string | null
    author: string
    justme: boolean
}

interface Message {
    role: string,
    content: string
}

interface Extra {
    prompt: string
    json_schema: object
}

interface Man {
    endpoint: string
    api_key: string | null
    model: string
    gameid: string
    tools: object[]
    res: Response
}

const app = express();
const port = 9340;


// Set paths
const publicPath = path.join(__dirname, "../../public");
const assetsPath = path.join(__dirname, "../../public/assets");
const lookupPath = path.join(__dirname, "../../public/data/lookup");
const extraPath = path.join(__dirname, "../../public/data/chat-extra");
const usersPath = path.join(__dirname, "../../public/data/users");
const toolsPath = path.join(__dirname, "../../public/data/tools");


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
app.get("/stories-for/:username", async (req: Request, res: Response) => {
    let username = req.params.username;
    try {
        const entries = await fs.readdir(assetsPath, { withFileTypes: true });
        const index = [];

        for (const entry of entries) {
            if (entry.isDirectory()) {
                const folderPath = path.join(assetsPath, entry.name);

                try {
                    const metadataPath = path.join(folderPath, "metadata.json");
                    const fileContent = await fs.readFile(metadataPath, "utf8");
                    const data = JSON.parse(fileContent) as GameDefinition;
                    const hidden = data.justme && data.author != username;

                    if (!hidden && data.code && data.title) {
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

// Fetch a story
app.get("/stories/:gameid", async (req: Request, res: Response) => {
    let gameid = req.params.gameid;
    let gameid_Path = path.join(assetsPath, gameid)

    try {
        const metadataPath = path.join(gameid_Path, "metadata.json");
        const metaContent = await fs.readFile(metadataPath, "utf8");
        const data = JSON.parse(metaContent) as GameDefinition;

        const promptPath = path.join(gameid_Path, "prompt.txt");
        const prompt = await fs.readFile(promptPath, "utf8");

        const _game_definition: GameDefinition = {
            code: data.code,
            title: data.title,
            bg_image: data.bg_image,
            bg_url: (data.bg_image ? `assets/${gameid}/${data.bg_image}` : ""),
            prompt,
            llmid: data.llmid ?? 1,
            extra: data.extra,
            author: data.author,
            justme: data.justme
        }

        console.log(`GET /stories/${gameid}`)
        res.json(_game_definition);
    }
    catch (err) {
        console.error(`GET /stories/${gameid}`, err);
        res.status(500).json({ hasError: true, message: "Impossible d'ouvrir le livre!" });
    }
});

// Update a story
app.put("/stories/:gameid", async (req: Request, res: Response) => {
    const { title, bg_image, prompt, llmid, extra, author, justme } = req.body as GameDefinition
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
        const game = <GameDefinition>{ code: gameid, title, bg_image, llmid: llmid ?? 1, extra, author, justme }

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



// Fetch story state of user
app.get("/users/:username/:gameid", async (req: Request, res: Response) => {
    let username = req.params.username;
    let gameid = req.params.gameid;
    let pages_Path = path.join(usersPath, `${username}/${username}_${gameid}_pages.json`)

    try {
        let pagesContent: string;
        if (!fs.existsSync(pages_Path))
            pagesContent = "[]";
        else
            pagesContent = await fs.readFile(pages_Path, "utf8");

        const pages = JSON.parse(pagesContent);

        console.log(`GET /stories/${gameid}/${username}`)
        res.json(pages);
    }
    catch (err) {
        console.error(`GET /stories/${gameid}/${username}`, err);
        res.status(500).json({ hasError: true, message: "Impossible de lire l'histoire du joueur" });
    }
});

app.put("/users/:username/:gameid", async (req: Request, res: Response) => {
    let username = req.params.username.toLowerCase();
    let gameid = req.params.gameid.toLowerCase();
    let pages_Path = path.join(usersPath, `${username}/${username}_${gameid}_pages.json`)

    try {
        await fs.writeFile(pages_Path, JSON.stringify(req.body));

        console.log(`PUT /users/${username}/${gameid}`);
        res.status(204).end();
    }
    catch (err) {
        console.error(`PUT /users/${username}/${gameid}`, err);
        res.status(500).json({ hasError: true, message: "Impossible de mettre à jour l'histoire du joueur" });
    }
});



// Execute story prompt
app.post("/old1_chat/:gameid", async (req: Request, res: Response) => {
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
});//OLD1

// Execute story prompt
app.post("/old2_chat/:gameid", async (req: Request, res: Response) => {
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
            const stream = await fetchOpenAILike(man, conversation, true);
            if (stream == null) return;

            let collectedText = "";
            let toolCalls: any[] = [];

            for await (const chunk of parseOpenAILikeStream(stream)) {
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
});//OLD2

// Execute story prompt
app.post("/old3_chat/:gameid", async (req: Request, res: Response) => {
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
                    tools: man.tools,
                    tool_choice: "auto",
                })
            });

            if (!openAIStream.body) throw new Error("No stream body received");

            const reader = openAIStream.body.getReader();
            let partialData = ""; // Stocke les fragments de JSON
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
});//OLD3

// Execute story prompt
app.post("/chat/:gameid", async (req: Request, res: Response) => {
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
});//NEW

// Fonction utilitaire pour tenter de parser une chaîne JSON
const tryParseJSON = (data: string): any | null => {
    try {
        return JSON.parse(data);
    }
    catch (err) {
        return null;
    }
};

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

// Execute story extra
app.post("/chat/:gameid/:extraid", async (req: Request, res: Response) => {
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
        const llm = llmList.find((one: any) => one.id == llmid) as any
        const api = llm.value1
        const model = llm.value2

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
            console.error(`POST /chat/${gameid}/${extra}`, error);
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
});

// Appeler OpenAI(like) api
async function fetchOpenAILike(man: Man, messages: any[], stream = false) {
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
            tool_choice: "auto",
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
async function* parseOpenAILikeStream(stream: ReadableStream<Uint8Array>) {
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



// For later...
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
