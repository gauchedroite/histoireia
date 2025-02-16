import express, { Request, Response, Application, NextFunction } from 'express';
import bodyParser from 'body-parser';
import fs from 'fs-extra';
import path from 'path';

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
app.post('/save-state/:filename', async (req: Request, res: Response) => {
    const jsonString = JSON.stringify(req.body);
    const fileName = `${req.params.filename}.json`;
    const filePath = path.join(dataPath, fileName);

    try {
        await fs.writeFile(filePath, jsonString);
        console.log('Successfully wrote file');
        res.send('Successfully wrote JSON to file.');
    } catch (error) {
        console.error('Error writing file', error);
        res.status(500).send("Failed to save the file: " + (error as Error).message);
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
        console.error("Error saving png file", error);
        res.status(500).send("Failed to upload file: " + (error as Error).message);
    }
});




// Start server
app.listen(port, "0.0.0.0", () => {
    console.log(`Server is running on http://0.0.0.0:${port}`);
});
