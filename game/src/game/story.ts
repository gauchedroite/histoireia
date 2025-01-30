import * as App from "../core/app.js"
import * as Router from "../core/router.js"
import * as Misc from "../core/misc.js"
import * as Theme from "../core/theme/theme.js"
import { state, GameDefinition, Message } from "./state.js"

export const NS = "GSTORY";


let mystate: GameDefinition
let gameid = ""
let pageno = 0
let isNew = false
let user_text = "";
let assistant_text = ""
let next_user_text: string | null = null


const formTemplate = () => {
    const add = (row: string) => rows.push(row);
    let rows: string[] = [];
    
    add(`<p>${user_text}</p>`)
    add(`<p>${assistant_text}</p>`)
    add(`<br>`)

    if (assistant_text.length > 0) {
        const disabled = (next_user_text == undefined || next_user_text.length == 0)

        add(Theme.renderInputText(NS, "next_user_text", next_user_text, <Theme.IOptText>{ required: true, placeholder: "Qu'est-ce que tu dis?" }))
        add(`<div style="--d:flex; --jc:flex-end;"><button type="button" onclick="${NS}.submit()" ${disabled ? "disabled" : ""}>OK!</button></div>`)
    }

    return rows.join("")
}

const pageTemplate = (form: string) => {
    return `
<div class="js-waitable">
    <h2>
        <a href="#/menu/${gameid}"><i class="fa-solid fa-arrow-left"></i></a>
        <span>${mystate.title}</span>
    </h2>
    <div class="form">
        ${form}
    </div>
</div>
`
}


const render_and_fetch_more = async () => {
    user_text = state.userMessageAtPage(pageno)
    App.render()

    assistant_text = state.assistantMessageAtPage(pageno)
    if (assistant_text == undefined) {
        assistant_text = await state.executePrompt(user_text)
        state.appendAssistantMessage(assistant_text)
    }

    App.untransitionUI()
    App.render()
}

export const fetch = (args: string[] | undefined) => {
    gameid = (args ? args[0] : "");
    pageno = +(args ? (args[1] != undefined ? args[1] : "new") : "new");
    isNew = isNaN(pageno)

    if (isNew) {
        state.resetMessages()
        .then(() => {
            Router.goto(`#/story/${gameid}/0`)
        })
    }
    else {
        App.prepareRender(NS, "Story", "game_story")
        state.fetch_game_definition(gameid)
            .then((payload: any) => {
                mystate = Misc.clone(payload) as GameDefinition
            })
            .then(render_and_fetch_more)
            .catch(render_and_fetch_more)
    }
}

export const render = () => {
    if (!App.inContext(NS)) return "";

    const form = formTemplate()
    return pageTemplate(form)
}

export const postRender = () => {
    if (!App.inContext(NS)) return
}


const getFormState = () => {
    next_user_text = Misc.fromInputText(`${NS}_next_user_text`, next_user_text);
}

export const onchange = (input: HTMLInputElement) => {
    getFormState();
    App.render();
}



export const submit = (input: HTMLInputElement) => {
    console.log(next_user_text)
}
