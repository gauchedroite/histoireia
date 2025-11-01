import express, { Request, Response, Application, NextFunction } from 'express';
import bodyParser from 'body-parser';
import fs from 'fs-extra';
import path from 'path';
import { createFunName } from './funny-name';
import { chat01, chat02, chat03, chat04, chatExtra } from './chat';
import { assetsPath, publicPath, usersPath, lookupPath } from './path-names';
import { LLMConfig, GameDefinition, KindLookup, GameList } from './chat-interfaces';


const app = express();
const port = 9340;





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
        const index: GameList[] = [];

        const kindPath = path.join(lookupPath, "kind.json");
        const kindContent = await fs.readFile(kindPath, "utf8");
        const kindList = JSON.parse(kindContent) as KindLookup[];

        for (const entry of entries) {
            if (entry.isDirectory()) {
                const folderPath = path.join(assetsPath, entry.name);

                try {
                    const metadataPath = path.join(folderPath, "metadata.json");
                    const fileContent = await fs.readFile(metadataPath, "utf8");
                    const data = JSON.parse(fileContent) as GameDefinition;
                    const hidden = data.justme && data.author != username;
                    const kind = kindList.find(one => one.id == data.kindid)

                    if (!hidden && data.code && data.title) {
                        index.push({
                            code: data.code,
                            title: data.title,
                            bg_image: data.bg_image,
                            bg_url: (data.bg_image ? `assets/billy/${data.bg_image}` : ""),
                            promptfile: `${data.code}.txt`,
                            kind_id: kind?.id,
                            kind_fa: kind?.fa
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

        const llmid = data.llmid
        const llmConfigPath = path.join(lookupPath, "llm.json");
        const llmContent = await fs.readFile(llmConfigPath, "utf8");
        const llmList = JSON.parse(llmContent) as LLMConfig[];
        const llm = llmList.find(one => one.id === llmid)!;

        const kindid = data.kindid
        const kindConfigPath = path.join(lookupPath, "kind.json");
        const kindContent = await fs.readFile(kindConfigPath, "utf8");
        const kindList = JSON.parse(kindContent) as KindLookup[];
        const kind = kindList.find(one => one.id === kindid)!;

        let prompt = ""
        if (kind.code == "llm") {
            const promptPath = path.join(gameid_Path, "prompt.txt");
            prompt = await fs.readFile(promptPath, "utf8");
        }
        else {
            const dataPath = path.join(gameid_Path, "data.tsv");
            prompt = await fs.readFile(dataPath, "utf8");
        }

        const _game_definition: GameDefinition = {
            code: data.code,
            title: data.title,
            bg_image: data.bg_image,
            bg_url: (data.bg_image ? `assets/${gameid}/${data.bg_image}` : ""),
            prompt,
            llmid: data.llmid ?? 1,
            extra: data.extra,
            author: data.author,
            justme: data.justme,
            hasJsonSchema: llm.hasJsonSchema,
            kindid: data.kindid
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
    const { title, bg_image, prompt, llmid, extra, author, justme, kindid } = req.body as GameDefinition
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
        const game = <GameDefinition>{ code: gameid, title, bg_image, llmid: llmid ?? 1, extra, author, justme, kindid }

        const gameid_jsonPath = path.join(gameid_Path, "metadata.json");
        await fs.writeFile(gameid_jsonPath, JSON.stringify(game));

        if (kindid == 1) {
            const promptPath = path.join(gameid_Path, "prompt.txt");
            await fs.writeFile(promptPath, prompt);
        }
        else {
            const dataPath = path.join(gameid_Path, "data.tsv");
            await fs.writeFile(dataPath, prompt);
        }

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
    let state_Path = path.join(usersPath, `${username}/${username}_${gameid}_state.json`)

    try {
        let state: any = null;

        let stateContent: string;
        if (!fs.existsSync(state_Path)) {
            state = "{}";
        }
        else {
            stateContent = await fs.readFile(state_Path, "utf8");
            state = JSON.parse(stateContent);
        }

        console.log(`GET /stories/${gameid}/${username}`)
        res.json(state);
    }
    catch (err) {
        console.error(`GET /stories/${gameid}/${username}`, err);
        res.status(500).json({ hasError: true, message: "Impossible de lire l'histoire du joueur" });
    }
});

app.put("/users/:username/:gameid", async (req: Request, res: Response) => {
    let username = req.params.username.toLowerCase();
    let gameid = req.params.gameid.toLowerCase();
    let pages_Path = path.join(usersPath, `${username}/${username}_${gameid}_state.json`)

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
app.post("/chat/:gameid", async (req: Request, res: Response) => {
    //chat01(req, res)
    //chat02(req, res)
    chat03(req, res)
    //chat04(req, res)
});

// Execute story extra
app.post("/chat/:gameid/:extraid", async (req: Request, res: Response) => {
    chatExtra(req, res)
});



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
