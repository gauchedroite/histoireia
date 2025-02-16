import express from "express";
import bodyParser from 'body-parser';
import * as fs from 'node:fs/promises';
import path from "path";

const app = express();
const port = 9340;


// Set paths
const publicPath = path.join(__dirname, "../public");
const dataPath = path.join(__dirname, "../public/data");
const srcPath = path.join(__dirname, "../src");


// Configure access to data files, without caching
app.use("/data", (req, res, next) => {
    console.log(`Accessing /data endpoint: ${req.method} ${req.url} at ${new Date().toISOString()}`);

    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.set("Surrogate-Control", "no-store");

    next();
});

app.use("/data", express.static(dataPath));

// Configure access to source files by the browser
app.use("/src", express.static(srcPath));

// Configure express default virtual folder
app.use(express.static(publicPath));


// Middleware to parse JSON bodies
app.use(bodyParser.json({ limit: "50mb" }));



app.post('/save-state/:filename', async (req, res) => {
    const jsonString = JSON.stringify(req.body);
    try {
        const fileName = `${req.params.filename}.json`
        const filePath = path.join(dataPath, fileName);

        await fs.writeFile(filePath, jsonString);

        console.log('Successfully wrote file');
        res.send('Successfully wrote JSON to file.');
    }
    catch (error: any) {
        console.log('Error writing file', error);
        res.status(500).send("Failed to save the file: " + error.message);
    }
});

app.post('/next-seqno', async (req, res) => {
    try {
        const filePath = path.join(dataPath, "_state.json");

        // Read and parse the state.json file
        let data = await fs.readFile(filePath, "utf8");
        let state = JSON.parse(data);

        // Increment the seqno property
        state.seqno++;

        // Write the updated state back to the file
        await fs.writeFile(filePath, JSON.stringify(state));

        // Send the incremented seqno back to the caller
        res.send({ seqno: state.seqno });

        console.log("Successfully incremented seqno");
    }
    catch (error: any) {
        console.log("Error writing file", error);
        res.status(500).send("Failed to save the file: " + error.message);
    }
});

app.post('/new-face/:filename', async (req, res) => {
    try {
        const fileName = req.params.filename
        const filePath = path.join(dataPath, fileName);
        const emptyPath = path.join(dataPath, "_empty.png");

        await fs.copyFile(emptyPath, filePath);

        console.log('Successfully copied file');
        res.send('Successfully created new face png.');
    }
    catch (error: any) {
        console.log('Error copying file', error);
        res.status(500).send("Failed to create new face png: " + error.message);
    }
});

app.post("/upload-face", async (req, res) => {
    try {
        const fileName = req.body.filename;
        const filePath = path.join(publicPath, fileName);
        const data = req.body.image;
        const base64Data = data.replace(/^data:image\/png;base64,/, "");

        await fs.writeFile(filePath, base64Data, "base64");

        console.log('Successfully saved face');
        res.status(200).send("File uploaded and saved as " + fileName);
    }
    catch (error: any) {
        console.log("Error saving png file", error);
        res.status(500).send("Failed to upload file: " + error.message);
    }
});



app.listen(port, "0.0.0.0", () => {
    console.log(`Server is running on http://0.0.0.0:${port}`);
});
