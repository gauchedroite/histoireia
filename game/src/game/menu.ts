import * as App from "../core/app.js"
import * as router from "../core/router.js"
import { Game as State } from "./game-objects.js"

export const NS = "GMENU";


let state: State = <State>{};
let gameid = ""



const formTemplate = () => {
    const add = (row: string) => rows.push(row);
    let rows: string[] = [];

    add(`<div class="box item"><a href="#/story/${gameid}">Continuer l'histoire</a></div>`)
    add(`<div class="box item"><a href="#/story/${gameid}">Recommencer à partir du début</a></div>`)
    add(`<div class="box item"><a href="#/editor/${gameid}">Editeur</a></div>`)

    return rows.join("")
}

const pageTemplate = (form: string) => {
    return `
<div>
    <h2>
        <a href="./"><i class="fa-solid fa-arrow-left"></i></a>
        <span>${state.title}</span>
    </h2>
</div>
<div class="form">
${form}
</div>
`
}



export const fetch = (args: string[] | undefined) => {
    gameid = (args ? args[0] : "");
    App.prepareRender(NS, "Menu", "game_menu")
    App.GET(`assets/${gameid}.json`)
        .then((payload: any) =>{
            state = payload;
        })
        .then(App.render)
        .catch(App.render);
}

export const render = () => {
    if (!App.inContext(NS)) return "";

    const form = formTemplate()
    return pageTemplate(form)
}

export const postRender = () => {
    if (!App.inContext(NS)) return
}
