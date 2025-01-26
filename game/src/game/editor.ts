import * as App from "../core/app.js"
import * as router from "../core/router.js"
import * as Misc from "../core/misc.js"
import * as Theme from "../core/theme/theme.js"
import { Game as IState } from "./game-objects.js"

export const NS = "GED";


let state: IState = <IState>{};
let gameid: string = ""
let isNew = false;



const formTemplate = (item: IState) => {
    const add = (row: string) => rows.push(row);
    let rows: string[] = [];

    add(Theme.renderFieldText(NS, "code", item.code, "Code", <Theme.IOptText>{ maxlength: 10, required: true }))
    add(Theme.renderFieldText(NS, "title", item.title, "Titre", <Theme.IOptText>{ maxlength: 32, required: true }))
    add(Theme.renderFieldTextarea(NS, "prompt", item.prompt, "Prompt", <Theme.IOptText>{ maxlength: 8192, required: true }))

    add("<ul>")
    if (isNew) {
        add(`<li><a href="#/editor/billy2">Enregistrer la nouvelle histoire</a> (${gameid})</li>`)
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

    if (!isNew) {
        App.GET(`assets/${gameid}.json`)
        .then((payload: any) =>{
            state = payload;
        })
        .then(App.render)
        .catch(App.render);
    }
    else {
        state = <IState>{
            code: "new",
            title: "NEW",
            bg_url: "",
            prompt: ""
        }
        Promise.resolve().then(App.render)
    }
}

export const render = () => {
    if (!App.inContext(NS)) return "";

    const form = formTemplate(state);
    return pageTemplate(form)
}

export const postRender = () => {
    if (!App.inContext(NS)) return
}



const getFormState = () => {
    let clone = Misc.clone(state) as IState;
    clone.code = Misc.fromInputText(`${NS}_code`, state.code);
    clone.title = Misc.fromInputText(`${NS}_title`, state.title);
    clone.prompt = Misc.fromInputText(`${NS}_prompt`, state.prompt);
    return clone;
}

export const onchange = (input: HTMLInputElement) => {
    state = getFormState();
    App.render();
}
