import * as App from "../core/app.js"
import * as router from "../core/router.js"
import * as Misc from "../core/misc.js"
import * as Theme from "../core/theme/theme.js"
import { left_arrow } from "../core/theme/theme-icon.js"
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
    add(Theme.renderFieldTextarea(NS, "prompt", item.prompt, "Prompt", <Theme.IOptText>{ maxlength: 8192, required: true, rows: 25 }))

    if (isNew) {
        add(`<button type="button" onclick="location.href='#/menu/${state.code}'"><i class="fa-solid fa-sparkles"></i>&nbsp;Enregistrer la nouvelle histoire //${state.code}</button>`)
    }
    else {
        add(`<button type="button" onclick="location.href='#/editor/${gameid}'"><i class="fa-light fa-floppy-disk"></i>&nbsp;Enregistrer les changements</button>`)
    }

    return rows.join("");
}

const pageTemplate = (form: string) =>{
    const returnurl = isNew ? `./` : `#/menu/${gameid}`;

    return `
<div>
    <h2>
        <a href="${returnurl}"><i class="fa-solid fa-arrow-left"></i></a>
        <span>Editeur</span>
    </h2>
</div>
<div class="form">
${form}
</div>
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
