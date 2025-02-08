import * as App from "../core/app.js"
import * as router from "../core/router.js"
import { state } from "./state.js";

export const NS = "GBONJOUR";


const template = () => {
    return `
<div class="bonjour">
    <h1>Bonjour</h1>
    <h1>${state.usernameCapitalized}!</h1>
</div>
<div class="form">
    <a href="#/home" style="color:white;">Choisis une histoire dans la bibliothèque!</a>
</div>
`
}


export const fetch = (args: string[] | undefined) => {
    let username = (args != undefined ? args[0] : "");
    username = username.length > 0 ? username : "laura"
    state.username = username
    App.prepareRender(NS, "Bonjour", "game_bonjour")
    App.renderOnNextTick();
}

export const render = () => {
    if (!App.inContext(NS)) return ""
    return template()
}

export const postRender = () => {
    if (!App.inContext(NS)) return
}
