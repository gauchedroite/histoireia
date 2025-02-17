import * as App from "../core/app.js"
import * as Misc from "../core/misc.js"
import * as Theme from "../core/theme/theme.js"
import { state, GameDefinition as IState } from "./state.js"

export const NS = "GED";


let mystate: IState = <IState>{};
let gameid: string = ""
let isNew = false;



const formTemplate = (item: IState) => {
    const add = (row: string) => rows.push(row);
    let rows: string[] = [];

    //add(Theme.renderFieldText(NS, "code", item.code, "Code", <Theme.IOptText>{ maxlength: 10, required: true }))
    add(Theme.renderFieldText(NS, "title", item.title, "Titre", <Theme.IOptText>{ maxlength: 32, required: true }))

    add(Theme.renderFieldTextarea(NS, "prompt", item.prompt, "Prompt", <Theme.IOptText>{ maxlength: 8192, required: true, rows: 22 }))

    if (isNew) {
        add(`<button type="button" class="button" onclick="${NS}.save_game_definition()"><i class="fa-solid fa-sparkles"></i>&nbsp;Enregistrer la nouvelle histoire</button>`)
    }
    else {
        add(`<button type="button" class="button" onclick="${NS}.save_game_definition()"><i class="fa-light fa-floppy-disk"></i>&nbsp;Enregistrer les changements</button>`)
    }

    return rows.join("");
}

const pageTemplate = (form: string) =>{
    const returnurl = isNew ? "#/home" : `#/menu/${gameid}`;

    return `
<div class="app-header">
    <a href="${returnurl}">
        <i class="fa-regular fa-chevron-left"></i>&nbsp;${mystate.title}
    </a>
</div>
<div class="app-content">
    ${form}
</div>
`
}



export const fetch = (args: string[] | undefined) => {
    gameid = (args ? args[0] : "")
    isNew = (gameid == "new")
    App.prepareRender(NS, "Editor", "screen_editor")

    if (!isNew) {
        state.fetch_game_definition(gameid)
            .then(payload => {
                 mystate = Misc.clone(payload) as IState
            })
            .then(App.untransitionUI)
            .then(App.render)
            .catch(App.render);
    }
    else {
        state.new_game_definition()
        mystate = Misc.clone(state.game_definition) as IState
        Promise.resolve()
            .then(App.untransitionUI)
            .then(App.render)
    }
}

export const refresh = () => {
    App.transitionUI()
    state.fetch_game_definition(gameid)
    .then(payload => {
         mystate = Misc.clone(payload) as IState
    })
    .then(App.untransitionUI)
    .then(App.render)
    .catch(App.render);
}

export const render = () => {
    if (!App.inContext(NS)) return "";

    const form = formTemplate(mystate);
    return pageTemplate(form)
}

export const postRender = () => {
    if (!App.inContext(NS)) return
}



const getFormState = () => {
    let clone = Misc.clone(mystate) as IState;
    clone.code = Misc.fromInputText(`${NS}_code`, mystate.code);
    clone.title = Misc.fromInputText(`${NS}_title`, mystate.title);
    clone.prompt = Misc.fromInputText(`${NS}_prompt`, mystate.prompt);
    return clone;
}

export const onchange = (input: HTMLInputElement) => {
    mystate = getFormState();
    App.render();
}


export const save_game_definition = async () => {
    gameid = await state.save_game_definition(mystate)
    isNew = false;
    refresh()
}
