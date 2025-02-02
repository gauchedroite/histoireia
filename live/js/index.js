import * as App from "./core/app.js";
import * as GameMain from "./game/main.js";
export const NS = "INDEX";
window[App.NS] = App;
App.initialize(() => {
    return `
        ${GameMain.render()}
    `;
}, () => {
    GameMain.postRender();
}, "Historiette");
GameMain.startup();
GameMain.assignDefaultRoute("^#/?(.*)$");
const onresize = () => {
    const portrait = window.innerWidth < window.innerHeight;
    document.body.classList.remove("portrait", "landscape");
    document.body.classList.add(portrait ? "portrait" : "landscape");
};
addEventListener("resize", onresize);
onresize();
document.addEventListener("touchstart", () => { });
