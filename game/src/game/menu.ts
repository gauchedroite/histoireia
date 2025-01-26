import * as App from "../core/app.js"
import * as router from "../core/router.js"

export const NS = "GMENU";


let gameid: string = ""
let showModal = false



export const fetch = (args: string[] | undefined) => {
    gameid = (args ? args[0] : "");
    App.prepareRender(NS, "Menu", "game_menu")
    App.render()
}

export const render = () => {
    if (!App.inContext(NS)) return "";

    return `
M E N U - ${gameid}
<ul>
    <li><a href="#/story/${gameid}">Continuer l'histoire</a></li>
    <li><a href="#/story/${gameid}">Recommencer à partir du début</a></li>
    <li><a href="#/editor/${gameid}">Editeur</a></li>
    <li><a href="./">Index</a></li>
</ul>
`
}

export const postRender = () => {
    if (!App.inContext(NS)) return
 }
