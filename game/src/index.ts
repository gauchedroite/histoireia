import * as App from "./core/app.js"
import * as GameMain from "./game/main.js"
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


// const gameid = (window.location.hash + "/").split("/")[1]
// const frontElement = document.getElementById(`screen_${gameid}`)
// if (frontElement)
//     frontElement.classList.add("ct-front")
