import * as App from "./core/app.js"
import * as GameMain from "./game/main.js"
import WebglRunner from "./common/webgl-runner.js";
import * as Reloader from "./common/reloader.js"

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
    const shader_name = "star_nest_retro"
    const canvas = document.getElementById("app_canvas")! as HTMLCanvasElement
    const vertexShader = await (await window.fetch(`./assets_app/_default_vertex_shader.glsl`)).text()
    const fragmentShader = await (await window.fetch(`./assets_app/${shader_name}.glsl`)).text()
    //runner.run(canvas, fragmentShader, vertexShader, "./images/stars-512x512.jpg")
}, 0);

// Pause the shader if were not on the login or the home pages
window.addEventListener("hashchange", () => {
    let hash = window.location.hash;
    if (hash.length == 0)
        hash = `#/`;

    if (hash.startsWith("#/editor") || hash.startsWith("#/story"))
        runner?.pause()
    else
        runner?.resume()
})
