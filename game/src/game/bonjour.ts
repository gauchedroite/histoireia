import * as App from "../core/app.js"
import * as router from "../core/router.js"
import { state } from "./state.js";

export const NS = "GBONJOUR";


const template = () => {
    const root = document.documentElement;
    const styles = getComputedStyle(root);
    const sait = styles.getPropertyValue('--sait').trim();
    const saib = styles.getPropertyValue('--saib').trim();
    const sail = styles.getPropertyValue('--sail').trim();
    const sair = styles.getPropertyValue('--sair').trim();

    return `
<div class="app-header"></div>
<div class="app-content">
    <div class="bonjour">
        <h1>Bonjour</h1>
        <h1>${state.usernameCapitalized}!</h1>
    </div>
    <div class="choose">
        <a href="#/home" class="start">Choisis une histoire dans la bibliothèque!</a>
    </div>
</div>
<div class="app-footer"></div>
`
}


export const fetch = (args: string[] | undefined) => {
    let username = (args != undefined ? args[0] : "");
    username = username.length > 0 ? username : "laura"
    state.username = username
    App.prepareRender(NS, "Bonjour", "screen_bonjour")
    App.renderOnNextTick();
}

export const render = () => {
    if (!App.inContext(NS)) return ""
    return template()
}

export const postRender = () => {
    if (!App.inContext(NS)) return
}
