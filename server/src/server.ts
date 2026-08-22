import express, { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import fs from 'fs-extra';
import path from 'path';
import { createFunName } from './funny-name';
import { chat03, chatExtra } from './chat';
import { assetsPath, publicPath, usersPath } from './path-names';
import { GameDefinition, GameList } from './chat-interfaces';
import { getLlm, getKindList, getKind } from './lookup';


export const app = express();
const port = 9340;

function sanitizeParam(value: string): string | null {
    return /^[a-z0-9]+$/.test(value) ? value : null;
}

const appSecret = process.env.APP_SECRET;

function checkAuth(req: Request, res: Response, next: NextFunction) {
    if (appSecret && req.headers.authorization !== `Bearer ${appSecret}`) {
        res.status(401).json({ hasError: true, message: "Non autorisé" });
        return;
    }
    next();
}

app.use("/stories", checkAuth);
app.use("/stories-for", checkAuth);
app.use("/users", checkAuth);
app.use("/chat", checkAuth);





// The src and webfonts folders are served by Caddy because
// they are referred to as /client/src and /webfonts
// which are outside /histoireia, our default virtual folder
//
//app.use("/client/src", express.static(path.join(__dirname, "../../client/src")));
//app.use("/webfonts", express.static(path.join(__dirname, "../../public/webfonts")));



// Middleware to print the URI of all requests
app.use((_req, _res, next) => {
    //console.log(`Requested URI: ${_req.originalUrl}`);
    next();
});

// Configure access to static files
app.use("/story", express.static(assetsPath));

// Configure express default virtual folder
app.use(express.static(publicPath));

// Middleware to parse JSON bodies
app.use(bodyParser.json({ limit: "50mb" }));



// List stories
app.get("/stories-for/:username", async (req: Request, res: Response) => {
    let username = sanitizeParam(req.params.username);
    if (!username) { res.status(400).json({ hasError: true, message: "Invalid username" }); return; }
    try {
        const entries = await fs.readdir(assetsPath, { withFileTypes: true });
        const index: GameList[] = [];
        const kindList = getKindList();

        for (const entry of entries) {
            if (entry.isDirectory()) {
                const folderPath = path.join(assetsPath, entry.name);

                try {
                    const metadataPath = path.join(folderPath, "metadata.json");
                    const fileContent = await fs.readFile(metadataPath, "utf8");
                    const data = JSON.parse(fileContent) as GameDefinition;
                    const kind = kindList.find(one => one.id == data.kindid)
                    if (data.code && data.title) {
                        index.push({
                            code: data.code,
                            title: data.title,
                            bg_image: data.bg_image,
                            bg_url: (data.bg_image ? `assets/${data.code}/${data.bg_image}` : ""),
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

// Shared reader for one game definition (metadata + prompt/data.tsv). Used by the
// user play endpoint and the admin editor endpoint.
async function readGameDefinition(gameid: string): Promise<GameDefinition> {
    const gameid_Path = path.join(assetsPath, gameid);
    const data = JSON.parse(await fs.readFile(path.join(gameid_Path, "metadata.json"), "utf8")) as GameDefinition;
    const kind = getKind(data.kindid)!;
    const contentFile = kind.code === "llm" ? "prompt.txt" : "data.tsv";
    const prompt = await fs.readFile(path.join(gameid_Path, contentFile), "utf8");
    const llm = getLlm(data.llmid ?? 1);
    return {
        code: data.code,
        title: data.title,
        bg_image: data.bg_image,
        bg_url: (data.bg_image ? `assets/${gameid}/${data.bg_image}` : ""),
        prompt,
        llmid: data.llmid ?? 1,
        extra: data.extra,
        hasJsonSchema: llm?.hasJsonSchema ?? false,
        kindid: data.kindid
    };
}

// Generate an unused random gameid folder name.
async function createUniqueGameid(): Promise<{ gameid: string; gameid_Path: string }> {
    while (true) {
        const gameid = createFunName();
        const gameid_Path = path.join(assetsPath, gameid);
        if (!fs.existsSync(gameid_Path))
            return { gameid, gameid_Path };
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

// Fetch a story (user side, for playing)
app.get("/stories/:gameid", async (req: Request, res: Response) => {
    let gameid = sanitizeParam(req.params.gameid);
    if (!gameid) { res.status(400).json({ hasError: true, message: "Invalid gameid" }); return; }
    try {
        console.log(`GET /stories/${gameid}`);
        res.json(await readGameDefinition(gameid));
    }
    catch (err) {
        console.error(`GET /stories/${gameid}`, err);
        res.status(500).json({ hasError: true, message: "Impossible d'ouvrir le livre!" });
    }
});

// List all games as cloneable templates for the user "new game" dropdown.
// Protected by checkAuth (user must be logged in).
app.get("/templates", checkAuth, async (_req: Request, res: Response) => {
    try {
        const entries = await fs.readdir(assetsPath, { withFileTypes: true });
        const templates: { code: string; title: string; kindid: number }[] = [];
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            try {
                const meta = JSON.parse(await fs.readFile(path.join(assetsPath, entry.name, "metadata.json"), "utf8")) as GameDefinition;
                if (meta.code && meta.title)
                    templates.push({ code: meta.code, title: meta.title, kindid: meta.kindid });
            }
            catch { /* skip malformed folder */ }
        }
        templates.sort((a, b) => a.title.localeCompare(b.title));
        res.json(templates);
    }
    catch (err) {
        console.error(`GET /templates`, err);
        res.status(500).json({ hasError: true, message: "Impossible d'obtenir les modèles!" });
    }
});

// Create a new game instance from a template: copies the prompt/data into a new
// folder owned by the user. The user never chooses the model — it is inherited
// from the admin's template. Protected by the /stories checkAuth blanket.
app.post("/stories/from-template", async (req: Request, res: Response) => {
    const { templateid, username } = req.body as { templateid: string; username: string };
    const uname = sanitizeParam(username);
    const tid = sanitizeParam(templateid);
    if (!uname || !tid) { res.status(400).json({ hasError: true, message: "Invalid template or username" }); return; }

    const templatePath = path.join(assetsPath, tid);
    try {
        const meta = JSON.parse(await fs.readFile(path.join(templatePath, "metadata.json"), "utf8")) as GameDefinition;
        const kind = getKind(meta.kindid);
        const contentFile = kind?.code === "llm" ? "prompt.txt" : "data.tsv";

        const { gameid, gameid_Path } = await createUniqueGameid();
        await fs.mkdir(gameid_Path);

        await fs.copy(path.join(templatePath, contentFile), path.join(gameid_Path, contentFile));
        if (meta.bg_image) {
            const imgSrc = path.join(templatePath, meta.bg_image);
            if (fs.existsSync(imgSrc)) await fs.copy(imgSrc, path.join(gameid_Path, meta.bg_image));
        }

        // ponytail: model inherited from the cloned game (user never sets it)
        const instance = {
            code: gameid, title: meta.title, bg_image: meta.bg_image,
            llmid: meta.llmid ?? 1, extra: meta.extra ?? null, kindid: meta.kindid
        };
        await fs.writeFile(path.join(gameid_Path, "metadata.json"), JSON.stringify(instance));

        console.log(`POST /stories/from-template -> ${gameid} (from ${tid}, user ${uname})`);
        res.json({ gameid });
    }
    catch (err) {
        console.error(`POST /stories/from-template`, err);
        res.status(500).json({ hasError: true, message: "Impossible de créer l'histoire!" });
    }
});

// ---------------------------------------------------------------------------
// Admin editor API. NO Express auth here — security is handled outside the app
// (e.g. Caddy basic_auth / IP allowlist on /histoireia/editor*). See Caddyfile.
// ---------------------------------------------------------------------------

// List every game for the admin editor
app.get("/editor/stories", async (_req: Request, res: Response) => {
    try {
        const entries = await fs.readdir(assetsPath, { withFileTypes: true });
        const games: { code: string; title: string; kindid: number }[] = [];
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            try {
                const meta = JSON.parse(await fs.readFile(path.join(assetsPath, entry.name, "metadata.json"), "utf8")) as GameDefinition;
                if (meta.code && meta.title)
                    games.push({ code: meta.code, title: meta.title, kindid: meta.kindid });
            }
            catch { /* skip malformed folder */ }
        }
        games.sort((a, b) => a.title.localeCompare(b.title));
        res.json(games);
    }
    catch (err) {
        console.error(`GET /editor/stories`, err);
        res.status(500).json({ hasError: true, message: "Impossible d'obtenir la liste!" });
    }
});

// Fetch one game for editing (admin)
app.get("/editor/stories/:gameid", async (req: Request, res: Response) => {
    const gameid = sanitizeParam(req.params.gameid);
    if (!gameid) { res.status(400).json({ hasError: true, message: "Invalid gameid" }); return; }
    try {
        res.json(await readGameDefinition(gameid));
    }
    catch (err) {
        console.error(`GET /editor/stories/${gameid}`, err);
        res.status(500).json({ hasError: true, message: "Impossible d'ouvrir le livre!" });
    }
});

// Create / update a story (admin).
app.put("/editor/stories/:gameid", async (req: Request, res: Response) => {
    const { title, bg_image, prompt, llmid, extra, kindid } = req.body as GameDefinition;
    let gameid = req.params.gameid === "new" ? "new" : sanitizeParam(req.params.gameid);
    if (!gameid) { res.status(400).json({ hasError: true, message: "Invalid gameid" }); return; }

    let gameid_Path: string;
    if (gameid === "new") {
        const created = await createUniqueGameid();
        gameid = created.gameid;
        gameid_Path = created.gameid_Path;
        await fs.mkdir(gameid_Path);
    }
    else {
        gameid_Path = path.join(assetsPath, gameid);
    }

    try {
        const kind = getKind(kindid);
        const game = { code: gameid, title, bg_image, llmid: llmid ?? 1, extra: extra ?? null, kindid };
        await fs.writeFile(path.join(gameid_Path, "metadata.json"), JSON.stringify(game));

        if (kind?.code === "llm")
            await fs.writeFile(path.join(gameid_Path, "prompt.txt"), prompt ?? "");
        else
            await fs.writeFile(path.join(gameid_Path, "data.tsv"), prompt ?? "");

        console.log(`PUT /editor/stories/${gameid}`);
        res.json({ gameid });
    }
    catch (err) {
        console.error(`PUT /editor/stories/${gameid}`, err);
        res.status(500).json({ hasError: true, message: "Impossible de mettre à jour le livre!" });
    }
});

// Delete a story (admin)
app.delete("/editor/stories/:gameid", async (req: Request, res: Response) => {
    const gameid = sanitizeParam(req.params.gameid);
    if (!gameid) { res.status(400).json({ hasError: true, message: "Invalid gameid" }); return; }
    const gameid_Path = path.join(assetsPath, gameid);

    try {
        const files = await fs.readdir(gameid_Path);
        for (const file of files) {
            await fs.unlink(path.join(gameid_Path, file));
        }
        await fs.rmdir(gameid_Path);
        console.log(`DELETE /editor/stories/${gameid}`);
        res.status(204).end();
    }
    catch (err) {
        console.error(`DELETE /editor/stories/${gameid}`, err);
        res.status(500).json({ hasError: true, message: "Impossible d'effacer le livre!" });
    }
});



// Fetch story state of user
app.get("/users/:username/:gameid", async (req: Request, res: Response) => {
    let username = sanitizeParam(req.params.username);
    if (!username) { res.status(400).json({ hasError: true, message: "Invalid username" }); return; }
    let gameid = sanitizeParam(req.params.gameid);
    if (!gameid) { res.status(400).json({ hasError: true, message: "Invalid gameid" }); return; }
    let state_Path = path.join(usersPath, `${username}/${username}_${gameid}_state.json`)

    try {
        let state: any = null;

        let stateContent: string;
        if (!fs.existsSync(state_Path)) {
            state = [];
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
    let username = sanitizeParam(req.params.username.toLowerCase());
    if (!username) { res.status(400).json({ hasError: true, message: "Invalid username" }); return; }
    let gameid = sanitizeParam(req.params.gameid.toLowerCase());
    if (!gameid) { res.status(400).json({ hasError: true, message: "Invalid gameid" }); return; }
    let pages_Path = path.join(usersPath, `${username}/${username}_${gameid}_state.json`)

    try {
        await fs.ensureDir(path.dirname(pages_Path));
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
    if (!sanitizeParam(req.params.gameid)) { res.status(400).json({ hasError: true, message: "Invalid gameid" }); return; }
    chat03(req, res)
});

// Execute story extra
app.post("/chat/:gameid/:extraid", async (req: Request, res: Response) => {
    if (!sanitizeParam(req.params.gameid)) { res.status(400).json({ hasError: true, message: "Invalid gameid" }); return; }
    if (!sanitizeParam(req.params.extraid)) { res.status(400).json({ hasError: true, message: "Invalid extraid" }); return; }
    chatExtra(req, res)
});



// For later...
app.post("/upload-face", checkAuth, async (req: Request, res: Response) => {
    const { filename: fileName, image } = req.body;

    // Validate filename: only alphanumeric, hyphens, underscores, and must end with .png
    if (!fileName || !/^[a-zA-Z0-9_-]+\.png$/.test(fileName)) {
        res.status(400).json({ hasError: true, message: "Invalid filename" });
        return;
    }

    const uploadsDir = path.join(publicPath, "uploads");
    await fs.ensureDir(uploadsDir);
    const filePath = path.join(uploadsDir, fileName);
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




// Start server (skip when imported for testing)
if (require.main === module) {
    app.listen(port, "0.0.0.0", () => {
        console.log(`Server is running on http://0.0.0.0:${port}`);
    });
}
