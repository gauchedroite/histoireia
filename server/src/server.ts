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
const assetsPath = path.join(__dirname, "../../public/assets");

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



// Define API routes
app.get("/story-index", async (req: Request, res: Response) => {
    try {
        const entries = await fs.readdir(assetsPath, { withFileTypes: true });
        const index = [];

        for (const entry of entries) {
            if (entry.isDirectory()) {
                const folderPath = path.join(assetsPath, entry.name);

                try {
                    // Assuming each folder contains a file named 'metadata.json' with `code` and `title`
                    const metadataPath = path.join(folderPath, "metadata.json");
                    const fileContent = await fs.readFile(metadataPath, "utf8");
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
                    console.error(`Error processing folder ${entry.name}:`, err);
                    res.status(500).send(`Error processing folder ${entry.name}:` + (err as Error).message);
                    return;
                }
            }
        }

        res.send(JSON.stringify(index));
    }
    catch (err) {
        console.error("Error scanning directory:", err);
        res.status(500).send("Error scanning directory: " + (err as Error).message);
    }
});

app.put("/story/:gameid", async (req: Request, res: Response) => {
    const { title, bg_url, prompt } = req.body as GameDefinition
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
        const game = <GameDefinition>{ code: gameid, title, bg_url }
    
        const gameid_jsonPath = path.join(gameid_Path, "metadata.json");
        const gameid_txtPath = path.join(gameid_Path, "prompt.txt");
    
        await fs.writeFile(gameid_jsonPath, JSON.stringify(game));
        await fs.writeFile(gameid_txtPath, prompt);

        console.log("Successfully wrote story definition");
        res.send(gameid);
    }
    catch (err) {
        console.error("Error writing story definition", err);
        res.status(500).send("Failed to save the story definition: " + (err as Error).message);
    }
});

app.delete("/story/:gameid", async (req: Request, res: Response) => {
    const gameid = req.params.gameid;
    const gameid_Path = path.join(assetsPath, gameid)

    try {
        const files = await fs.readdir(gameid_Path);

        // Delete each file in folder
        for (const file of files) {
            const filePath = path.join(gameid_Path, file);

            await fs.unlink(filePath);
            console.log(`Deleted file: ${filePath}`);
        }

        // After deleting all files, remove the folder
        await fs.rmdir(gameid_Path);
        console.log(`Deleted directory: ${gameid_Path}`);
    }
    catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        res.status(500).send((err as Error).message);
    }

    res.status(200).json({ message: `L'histoire ${gameid} a été effacée.` });
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
