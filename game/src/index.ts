import * as App from "./core/app.js"
import * as router from "./core/router.js"
//
import * as GameMain from "./game/main.js"

export const NS = "GINDEX";


// To allow Safari on my (old) Mac Mini to reach Live Server (port 5502) on my WSL dev environment:
// Mac Mini: http://<IP of my Windows box>:4999
// Windows: netsh interface portconfig add v4tov4 listenport=4999 listenaddress=0.0.0.0 connectport=5502 connectaddress=127.0.0.1
// Windows Firewall: inbound rule to open port 4999


declare const FastClick: any;
FastClick.attach(document.body);


// Global reference to the app. Used for some event handlers.
(window as any)[App.NS] = App;




const fetch = (args: string[] | undefined) => {
    App.prepareRender(NS, "Index", "game_index")
    App.render()
}

export const render = () => {
    if (!App.inContext(NS)) return "";

    return `
    <canvas id="index_canvas" class="full-viewport"></canvas>
    <div id="game_index_menu">
        <div><a href="#/menu/billy" style="color:whitesmoke;">Billy</a></div>
    </div>`
}

export const postRender = () => {
    if (!App.inContext(NS)) return
 }





// Initialize the app
App.initialize(
    () => {
        return `
        ${GameMain.render()}
        ${render()}
    `
    }, () => {
        GameMain.postRender();
        postRender();
    }, 
    "Teller");

    // Configure routes
GameMain.startup();

// Add a catchall route (in index.ts itself)
router.addRoute("^#/?(.*)$", params => fetch(params));





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
