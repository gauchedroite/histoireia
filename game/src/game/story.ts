import * as App from "../core/app.js"
import * as router from "../core/router.js"

export const NS = "GSTORY";


let gameid: string = ""



export const fetch = (args: string[] | undefined) => {
    gameid = (args ? args[0] : "");
    App.prepareRender(NS, "Story", "game_story")
    App.render()
}

export const render = () => {
    if (!App.inContext(NS)) return "";

    return `
S T O R Y - ${gameid}
<ul>
    <li><a href="#/menu/${gameid}">Retourner au menu</a></li>
</ul>
`
}

export const postRender = () => {
    if (!App.inContext(NS)) return
 }
