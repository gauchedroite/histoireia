import express, { Request, Response, Application, NextFunction } from 'express';
import bodyParser from 'body-parser';
import fs from 'fs-extra';
import path from 'path';
import { createFunName } from './funny-name';

interface GameDefinition {
    code: string
    title: string
    bg_url: string | null
    prompt: string
}

const app = express();
const port = 9340;


// Set paths
const publicPath = path.join(__dirname, "../../public");
const srcPath = path.join(__dirname, "../../client/src");
const dataPath = path.join(__dirname, "../../public/assets");
//const webfontsPath = path.join(__dirname, "../../public/webfonts");



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
app.use("/data", noCache);


// Configure access to static files
app.use("/data", express.static(dataPath));

// Configure access to source files by the browser
app.use("/client/src", express.static(srcPath));

// Configure access to the webfonts
//app.use("/webfonts", express.static(webfontsPath));

// Configure express default virtual folder
app.use(express.static(publicPath));

// Middleware to parse JSON bodies
app.use(bodyParser.json({ limit: "50mb" }));



// Define API routes
app.get("/game-index", async (req: Request, res: Response) => {
    try {
        const files = await fs.readdir(dataPath);
        const index = [];

        for (const file of files) {
            if (path.extname(file) === '.json') {
                const filePath = path.join(dataPath, file);

                try {
                    const fileContent = await fs.readFile(filePath, 'utf8');
                    const data = JSON.parse(fileContent);

                    if (data.code && data.title) {
                        index.push({
                            code: data.code,
                            title: data.title,
                            promptfile: `${data.code}.txt`
                        });
                    }
                }
                catch (err) {
                    console.error(`Error processing file ${file}:`, err);
                    res.status(500).send(`Error processing file ${file}:` + (err as Error).message);
                    return;
                }
            }
        }

        res.send(JSON.stringify(index));
    }
    catch (err) {
        console.error('Error scanning directory:', err);
        res.status(500).send("Error scanning directory: " + (err as Error).message);
    }
});

app.post('/save-game-def/:code', async (req: Request, res: Response) => {
    const { title, bg_url, prompt } = req.body as GameDefinition
    let code = req.params.code;
    if (code == "new")
        code = createFunName()

    const game = <GameDefinition>{ code, title, bg_url }
    
    const gameid_json = `${code}.json`;
    const gameid_jsonPath = path.join(dataPath, gameid_json);
    
    const gameid_txt = `${code}.txt`;
    const gameid_txtPath = path.join(dataPath, gameid_txt);

    try {
        await fs.writeFile(gameid_jsonPath, JSON.stringify(game));
        await fs.writeFile(gameid_txtPath, prompt);

        console.log('Successfully wrote game definition');
        res.send(code);
    }
    catch (error) {
        console.error('Error writing game definition', error);
        res.status(500).send("Failed to save the game definition: " + (error as Error).message);
    }
});

app.post('/next-seqno', async (_req: Request, res: Response) => {
    const filePath = path.join(dataPath, "_state.json");

    try {
        let data = await fs.readFile(filePath, "utf8");
        let state = JSON.parse(data);
        state.seqno++;

        await fs.writeFile(filePath, JSON.stringify(state));

        res.send({ seqno: state.seqno });
        console.log("Successfully incremented seqno");
    }
    catch (error) {
        console.error("Error writing file", error);
        res.status(500).send("Failed to save the file: " + (error as Error).message);
    }
});

app.post('/new-face/:filename', async (req: Request, res: Response) => {
    const fileName = req.params.filename;
    const filePath = path.join(dataPath, fileName);
    const emptyPath = path.join(dataPath, "_empty.png");

    try {
        await fs.copyFile(emptyPath, filePath);
        console.log('Successfully copied file');
        res.send('Successfully created new face png.');
    }
    catch (error) {
        console.error('Error copying file', error);
        res.status(500).send("Failed to create new face png: " + (error as Error).message);
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
