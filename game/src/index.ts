import * as App from "./core/app.js"
import * as GameMain from "./game/main.js"

export const NS = "INDEX";


// Global reference to the app. Used for some event handlers.
(window as any)[App.NS] = App;


// Initialize the app
App.initialize(
    () => {
        return `
        ${GameMain.render()}
    `
    }, () => {
        GameMain.postRender();
    }, 
    "Historiette"
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
addEventListener("resize", onresize);
onresize();


// This makes the :active CSS pseudo selector work to style taps on elements.
document.addEventListener("touchstart", () => {});
