import * as App from "../core/app.js"
import * as Misc from "../core/misc.js"
import { state, GameDefinition as IState, Message } from "./state.js"

export const NS = "GMENU";


let mystate: IState
let mystate2: Message[]
let gameid = ""



const formTemplate = (messages: Message[]) => {
    const add = (row: string) => rows.push(row);
    const action = (href: string, text: string) => rows.push(`<a href="${href}"><div><div>${text}</div><i class="fa-regular fa-chevron-right"></i></div></a>`);
    let rows: string[] = [];

    const lastPage = state.lastPageNo()

    add(`<div class="title">${mystate.title}</div>`)
    add(`<div class="app-list">`)

    if (lastPage == -1) {
        action(`#/story/${gameid}/new`, "Commencer à lire")
    }
    else {
        action(`#/story/${gameid}/${lastPage}`, "Continuer à lire")
        action(`#/story/${gameid}/new`, "Recommencer le livre?")
    }
    action(`#/editor/${gameid}`, "Éditeur")

    add("</div>")
    return rows.join("")
}

const pageTemplate = (form: string) => {
    return `
<div class="app-header">
    <a href="#/home">
        <i class="fa-regular fa-chevron-left"></i>&nbsp;Bibliothèque
    </a>
    <!--
    <div>qaz</div>
    <div>share</div>
    -->
</div>
<div class="app-content">
    ${form}
</div>
`
}



export const fetch = (args: string[] | undefined) => {
    gameid = (args ? args[0] : "");
    App.prepareRender(NS, "Menu", "screen_menu")
    state.fetch_game_definition(gameid)
        .then((payload: any) =>{
            mystate = Misc.clone(payload) as IState
            mystate2 = state.getMessages()
        })
        .then(App.untransitionUI)
        .then(App.render)
        .catch(App.render);
}

export const render = () => {
    if (!App.inContext(NS)) return "";

    const form = formTemplate(mystate2)
    return pageTemplate(form)
}

export const postRender = () => {
    if (!App.inContext(NS)) return
}
