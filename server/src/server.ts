import express, { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import fs from 'fs-extra';
import path from 'path';
import { createFunName } from './funny-name';
import { chat03, chatExtra } from './chat';
import { assetsPath, lookupPath, publicPath, usersPath } from './path-names';
import { GameDefinition, GameList, LLMConfig } from './chat-interfaces';
import { getLlm, getKindList, getKind, resolveTemplateId } from './lookup';


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



// List stories for a user: shared templates (in assets/) plus this user's
// private instances (data/users/{user}/*_instance.json). Instances are not
// visible to other users — they live in the user's own folder.
app.get("/stories-for/:username", async (req: Request, res: Response) => {
    let username = sanitizeParam(req.params.username);
    if (!username) { res.status(400).json({ hasError: true, message: "Invalid username" }); return; }
    try {
        const kindList = getKindList();
        const index: GameList[] = [];

        // Templates (shared definitions)
        const entries = await fs.readdir(assetsPath, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            try {
                const data = JSON.parse(await fs.readFile(path.join(assetsPath, entry.name, "metadata.json"), "utf8")) as GameDefinition;
                const kind = kindList.find(one => one.id == data.kindid);
                if (data.code && data.title) {
                    index.push({
                        code: data.code,
                        title: data.title,
                        bg_image: data.bg_image,
                        bg_url: (data.bg_image ? `assets/${data.code}/${data.bg_image}` : ""),
                        promptfile: `${data.code}.txt`,
                        kind_id: kind?.id,
                        kind_fa: kind?.fa,
                        started: fs.existsSync(path.join(usersPath, username, `${data.code}_state.json`))
                    });
                }
            }
            catch (err) {
                console.error(`GET /stories-for: skipping malformed template ${entry.name}`, err);
            }
        }

        // Per-user instances (private copies of a template)
        const userDir = path.join(usersPath, username);
        if (fs.existsSync(userDir)) {
            for (const file of await fs.readdir(userDir)) {
                if (!file.endsWith("_instance.json")) continue;
                try {
                    const inst = JSON.parse(await fs.readFile(path.join(userDir, file), "utf8"));
                    const tplMeta = JSON.parse(await fs.readFile(path.join(assetsPath, inst.templateid, "metadata.json"), "utf8")) as GameDefinition;
                    const kind = kindList.find(one => one.id == tplMeta.kindid);
                    const instanceid = file.replace(/_instance\.json$/, "");
                    index.push({
                        code: instanceid,
                        title: inst.title,
                        bg_image: tplMeta.bg_image,
                        bg_url: (tplMeta.bg_image ? `assets/${inst.templateid}/${tplMeta.bg_image}` : ""),
                        promptfile: "",
                        kind_id: kind?.id,
                        kind_fa: kind?.fa,
                        started: fs.existsSync(path.join(userDir, `${instanceid}_state.json`))
                    });
                }
                catch (err) {
                    console.error(`GET /stories-for: skipping malformed instance ${file}`, err);
                }
            }
        }

        index.sort((a, b) => (a.title).localeCompare(b.title));
        res.json(index);
    }
    catch (err) {
        console.error(`GET /stories-for/${username}`, err);
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
        hasJsonSchema: llm?.hasJsonSchema ?? false,
        kindid: data.kindid
    };
}

// Generate an unused random gameid folder name (for the admin editor).
async function createUniqueGameid(): Promise<{ gameid: string; gameid_Path: string }> {
    while (true) {
        const gameid = createFunName();
        const gameid_Path = path.join(assetsPath, gameid);
        if (!fs.existsSync(gameid_Path))
            return { gameid, gameid_Path };
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

// Fresh unique instance id for a user: not a template folder, and not an
// existing instance or state file in the user's folder. State files are keyed
// by the URL id, so an instance id must never collide with a template the user
// has already played (whose state file would then be overwritten).
async function createUniqueInstanceId(username: string): Promise<string> {
    const userDir = path.join(usersPath, username);
    while (true) {
        const id = createFunName();
        const taken =
            fs.existsSync(path.join(assetsPath, id, "metadata.json")) ||
            fs.existsSync(path.join(userDir, `${id}_instance.json`)) ||
            fs.existsSync(path.join(userDir, `${id}_state.json`));
        if (!taken) return id;
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

// Fetch a story (user side, for playing). gameid may be a template (in assets/)
// or a per-user instance (data/users/{user}/{id}_instance.json), resolved to its
// template for the prompt/llmid/kind, with the instance's display title.
app.get("/stories/:gameid", async (req: Request, res: Response) => {
    let gameid = sanitizeParam(req.params.gameid);
    if (!gameid) { res.status(400).json({ hasError: true, message: "Invalid gameid" }); return; }
    try {
        if (fs.existsSync(path.join(assetsPath, gameid, "metadata.json"))) {
            console.log(`GET /stories/${gameid}`);
            res.json(await readGameDefinition(gameid));
            return;
        }
        const username = sanitizeParam(req.query.user as string);
        if (!username) { res.status(404).json({ hasError: true, message: "Livre introuvable" }); return; }
        const instPath = path.join(usersPath, username, `${gameid}_instance.json`);
        if (!fs.existsSync(instPath)) { res.status(404).json({ hasError: true, message: "Livre introuvable" }); return; }
        const inst = JSON.parse(await fs.readFile(instPath, "utf8"));
        const def = await readGameDefinition(inst.templateid);
        def.code = gameid;       // instance id (used in URLs)
        def.title = inst.title;  // instance display title ("Samuel de Champlain (2)")
        console.log(`GET /stories/${gameid} (instance of ${inst.templateid}, user ${username})`);
        res.json(def);
    }
    catch (err) {
        console.error(`GET /stories/${gameid}`, err);
        res.status(500).json({ hasError: true, message: "Impossible d'ouvrir le livre!" });
    }
});

// Create a new blank instance of a game for a user, by reference to a template.
// Copies nothing — the instance just records its templateid + a display title
// ("<template title> (N)"); the prompt/llmid/kind stay in the template. The state
// file is created on first play (GET /users/:username/:gameid returns [] when
// absent). Protected by the /users checkAuth blanket. The model is inherited
// from the template — the user never chooses it.
app.post("/users/:username/instances", async (req: Request, res: Response) => {
    const { from } = req.body as { from: string };
    let username = sanitizeParam(req.params.username);
    let fromId = sanitizeParam(from);
    if (!username || !fromId) { res.status(400).json({ hasError: true, message: "Invalid username or game id" }); return; }

    try {
        const templateid = await resolveTemplateId(fromId, username);
        if (!templateid) { res.status(404).json({ hasError: true, message: "Livre introuvable" }); return; }
        const meta = JSON.parse(await fs.readFile(path.join(assetsPath, templateid, "metadata.json"), "utf8")) as GameDefinition;

        const userDir = path.join(usersPath, username);
        await fs.ensureDir(userDir);

        // First copy is "(2)" — the template is the implicit "(1)".
        let maxIndex = 1;
        for (const file of await fs.readdir(userDir)) {
            if (!file.endsWith("_instance.json")) continue;
            try {
                const other = JSON.parse(await fs.readFile(path.join(userDir, file), "utf8"));
                if (other.templateid === templateid && typeof other.index === "number" && other.index > maxIndex)
                    maxIndex = other.index;
            }
            catch { /* ignore corrupt instance file */ }
        }
        const newIndex = maxIndex + 1;

        const instanceid = await createUniqueInstanceId(username);
        const instance = { templateid, title: `${meta.title} (${newIndex})`, index: newIndex };
        await fs.writeFile(path.join(userDir, `${instanceid}_instance.json`), JSON.stringify(instance));

        console.log(`POST /users/${username}/instances -> ${instanceid} (from ${templateid}, copy ${newIndex})`);
        res.json({ instanceid });
    }
    catch (err) {
        console.error(`POST /users/${username}/instances`, err);
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
    const { title, bg_image, prompt, llmid, kindid } = req.body as GameDefinition;
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
        const game = { code: gameid, title, bg_image, llmid: llmid ?? 1, kindid };
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

// Upload the title-page image (admin). Raw body; filename from query.
// ponytail: no multer — express.raw on the route, filename in the query string.
app.post("/editor/stories/:gameid/image", express.raw({ type: "*/*", limit: "10mb" }), async (req: Request, res: Response) => {
    const gameid = sanitizeParam(req.params.gameid);
    if (!gameid) { res.status(400).json({ hasError: true, message: "Invalid gameid" }); return; }
    const filename = (req.query.filename as string ?? "").toLowerCase();
    if (!/^[a-z0-9._-]+\.(jpg|jpeg|png|gif|webp)$/.test(filename)) { res.status(400).json({ hasError: true, message: "Invalid filename" }); return; }
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) { res.status(400).json({ hasError: true, message: "No image data" }); return; }
    try {
        const gameid_Path = path.join(assetsPath, gameid);
        await fs.writeFile(path.join(gameid_Path, filename), req.body);
        console.log(`POST /editor/stories/${gameid}/image -> ${filename}`);
        res.json({ filename });
    }
    catch (err) {
        console.error(`POST /editor/stories/${gameid}/image`, err);
        res.status(500).json({ hasError: true, message: "Impossible de téléverser l'image!" });
    }
});


// ---------------------------------------------------------------------------
// LLM config editor API. Same no-Express-auth rule as /editor/stories — gated
// by Caddy on /histoireia/editor*. Edits public/data/lookup/llm.json directly;
// the fs.watch in lookup.ts reloads the in-memory list on change.
// ---------------------------------------------------------------------------

app.get("/editor/llm", async (_req: Request, res: Response) => {
    try {
        const list: LLMConfig[] = JSON.parse(await fs.readFile(path.join(lookupPath, "llm.json"), "utf8"));
        list.sort((a, b) => a.id - b.id);
        res.json(list);
    }
    catch (err) {
        console.error("GET /editor/llm", err);
        res.status(500).json({ hasError: true, message: "Impossible d'obtenir les LLM!" });
    }
});

// Create (id "new") / update an LLM (admin).
app.put("/editor/llm/:id", async (req: Request, res: Response) => {
    const idParam = req.params.id === "new" ? "new" : sanitizeParam(req.params.id);
    if (!idParam) { res.status(400).json({ hasError: true, message: "Invalid id" }); return; }
    const entry = req.body as LLMConfig;
    const llmPath = path.join(lookupPath, "llm.json");
    try {
        const list: LLMConfig[] = JSON.parse(await fs.readFile(llmPath, "utf8"));
        if (idParam === "new") {
            entry.id = list.reduce((m, l) => Math.max(m, l.id), 0) + 1;
            list.push(entry);
        }
        else {
            const i = list.findIndex(l => l.id === Number(idParam));
            if (i < 0) { res.status(404).json({ hasError: true, message: "LLM introuvable" }); return; }
            entry.id = Number(idParam);
            list[i] = entry;
        }
        await fs.writeFile(llmPath, JSON.stringify(list, null, 4));
        console.log(`PUT /editor/llm/${idParam} -> ${entry.id}`);
        res.json({ id: entry.id });
    }
    catch (err) {
        console.error(`PUT /editor/llm/${idParam}`, err);
        res.status(500).json({ hasError: true, message: "Impossible de mettre à jour le LLM!" });
    }
});

// Delete an LLM (admin)
app.delete("/editor/llm/:id", async (req: Request, res: Response) => {
    const idParam = sanitizeParam(req.params.id);
    if (!idParam) { res.status(400).json({ hasError: true, message: "Invalid id" }); return; }
    const llmPath = path.join(lookupPath, "llm.json");
    try {
        const list: LLMConfig[] = JSON.parse(await fs.readFile(llmPath, "utf8"));
        const i = list.findIndex(l => l.id === Number(idParam));
        if (i < 0) { res.status(404).json({ hasError: true, message: "LLM introuvable" }); return; }
        list.splice(i, 1);
        await fs.writeFile(llmPath, JSON.stringify(list, null, 4));
        console.log(`DELETE /editor/llm/${idParam}`);
        res.status(204).end();
    }
    catch (err) {
        console.error(`DELETE /editor/llm/${idParam}`, err);
        res.status(500).json({ hasError: true, message: "Impossible d'effacer le LLM!" });
    }
});



// Fetch story state of user
app.get("/users/:username/:gameid", async (req: Request, res: Response) => {
    let username = sanitizeParam(req.params.username);
    if (!username) { res.status(400).json({ hasError: true, message: "Invalid username" }); return; }
    let gameid = sanitizeParam(req.params.gameid);
    if (!gameid) { res.status(400).json({ hasError: true, message: "Invalid gameid" }); return; }
    let state_Path = path.join(usersPath, `${username}/${gameid}_state.json`)

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
    let pages_Path = path.join(usersPath, `${username}/${gameid}_state.json`)

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
    // ponytail: extraid names a file in public/data/chat-extra/ (e.g. 3_choix.json); allow underscore
    if (!/^[a-z0-9_]+$/.test(req.params.extraid)) { res.status(400).json({ hasError: true, message: "Invalid extraid" }); return; }
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
