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
<div class="app-content">
    <div class="content">
        <div class="bonjour">Bonjour ${state.usernameCapitalized}!</div>
        <a class="visual" href="#/home"></a>
        <a class="choose" href="#/home">Choisis une histoire dans la bibliothèque!</a>
    </div>
</div>
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
