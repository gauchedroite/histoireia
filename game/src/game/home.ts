import * as App from "../core/app.js"
import * as router from "../core/router.js"

export const NS = "GHOME";



export const fetch = (args: string[] | undefined) => {
    App.prepareRender(NS, "Home", "game_home")
    App.render()
}

export const render = () => {
    if (!App.inContext(NS)) return "";

    return `
H O M E
<ul>
    <li><a href="#/menu/billy">Billy mettons</a></li>
    <li><a href="#/editor/new">Ajouter une histoire</a></li>
</ul>
`
}

export const postRender = () => {
    if (!App.inContext(NS)) return
 }
