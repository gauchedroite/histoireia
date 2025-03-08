import * as App from "./core/app.js"
import * as GameMain from "./game/main.js"
import WebglRunner from "./game/webgl-runner.js";
import * as Reloader from "./reloader.js"

export const NS = "INDEX";


// Global reference to the app. Used for some event handlers.
(window as any)[App.NS] = App;
(window as any)[Reloader.NS] = Reloader;


// Initialize the app
App.initialize(
    () => {
        return `
        ${GameMain.render()}
    `
    }, () => {
        GameMain.postRender();
    }, 
    "HistoireIA"
);


// Configure routes
GameMain.startup();
GameMain.assignDefaultRoute("^#/?(.*)$");


// Add a portrait/landscape class to the body to match the orientation
const onresize = () => {
    const portrait = window.innerWidth < window.innerHeight;
    document.body.classList.remove("portrait", "landscape");
    document.body.classList.add(portrait ? "portrait" : "landscape");
};
//addEventListener("resize", onresize);
//onresize();


// Background shader
const runner = new WebglRunner()
setTimeout(async () => {
    const canvas = document.getElementById("app_canvas")! as HTMLCanvasElement
    const fragmentShader = await (await window.fetch("./assets_app/default_fs.txt")).text()
    const vertexShader = await (await window.fetch("./assets_app/default_vs.txt")).text()
    runner.run(canvas, fragmentShader, vertexShader)
}, 0);
