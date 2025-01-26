import * as App from "../core/app.js"
import * as router from "../core/router.js"

export const NS = "GED";


interface State {
    code: string
    title: string
    bg_url: string
    prompt: string
}
let state: State = <State>{};
let gameid: string = ""
let isNew = false;



const formTemplate = () => {

    const add = (row: string) => rows.push(row);
    let rows: string[] = [];

    add("<ul>")
    if (isNew) {
        add(`<li><a href="#/editor/billy2">Enregistrer la nouvelle histoire</a> (billy2)</li>`)
        add(`<li><a href="./">Index</a></li>`)
    }
    else {
        add(`<li><a href="#/editor/${gameid}">Enregistrer les changements</a></li>`)
        add(`<li><a href="#/menu/${gameid}">Retourner au menu</a></li>`)
    }
    add("</ul>")

    return rows.join("");
}

const pageTemplate = (form: string) =>{
    return `
E D I T E U R - ${state.title}
${form}
`
}



export const fetch = (args: string[] | undefined) => {
    gameid = (args ? args[0] : "")
    isNew = (gameid == "new")
    App.prepareRender(NS, "Editor", "game_editor")
    App.GET(`assets/${gameid}.json`)
        .then((payload: any) =>{
            state = payload;
        })
        .then(App.render)
        .catch(App.render);
}

export const render = () => {
    if (!App.inContext(NS)) return "";

    const form = formTemplate();
    return pageTemplate(form)
}

export const postRender = () => {
    if (!App.inContext(NS)) return
 }
