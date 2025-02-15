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
let assistant_text: string | null = null
let next_user_text: string | null = null


const formTemplate = () => {
    const add = (row: string) => rows.push(row);
    let rows: string[] = [];
    
    if (pageno > 0)
        add(`<div class="user">${user_text?.replace(/\n/g, "<br>")}</div>`)

    add(`<div id="ct_response">${assistant_text?.replace(/\n/g, "<br>") ?? ""}</div>`)

    if (assistant_text && assistant_text.length > 0) {
        const disabled = (next_user_text == undefined || next_user_text.length == 0)
        const button = `<button type="submit" onclick="${NS}.submit()" ${disabled ? "disabled" : ""}><i class="fa-light fa-arrow-up"></i></button>`
        const label = `<div class="ask"><div><b>À toi, ${state.usernameCapitalized} :</b></div>${button}</div>`
        const textarea = Theme.renderFieldTextarea(NS, "next_user_text", next_user_text, "", <Theme.IOptText>{ required: true, rows: 4 })

        add(label)
        add(`<div class="input">${textarea}</div>`)
    }

    return rows.join("")
}

const pageTemplate = (form: string) => {
    const lastPageNo = state.lastPageNo()
    let prev_url = `#/story/${gameid}/${pageno - 1}`
    let first_url = `#/story/${gameid}/0`
    let prev_disabled = (pageno == 0 ? "disabled" : "")

    let next_url = `#/story/${gameid}/${pageno + 1}`
    let last_url = `#/story/${gameid}/${lastPageNo}`
    let next_disabled = (pageno == lastPageNo ? "disabled" : "")

    return `
<div class="app-header">
    <a class="js-waitable-2" href="#/menu/${gameid}">
        <i class="fa-regular fa-chevron-left"></i>&nbsp;${mystate.title}
    </a>
</div>
<div class="app-content">
    ${form}
</div>
<div class="app-footer js-waitable-2">
    <button type="button" onclick="window.location='${first_url}'" ${prev_disabled} title="prev"><i class="fa-solid fa-left-to-line"></i></button>
    <button type="button" onclick="window.location='${prev_url}'" ${prev_disabled} title="prev"><i class="fa-solid fa-left"></i></button>
    <div>${pageno + 1}/${lastPageNo + 1}</div>
    <button type="button" onclick="window.location='${next_url}'" ${next_disabled} title="next"><i class="fa-solid fa-right"></i></button>
    <button type="button" onclick="window.location='${last_url}'" ${next_disabled} title="next"><i class="fa-solid fa-right-to-line"></i></button>
</div>
`
}

const streamUpdater = (message: string) => {
    const span = document.createElement("span");
    span.innerHTML = message.replace(/\n/g, "<br>");
    document.getElementById("ct_response")?.appendChild(span);
}


const render_and_fetch_more = async () => {
    user_text = state.userMessageOnPage(pageno)
    next_user_text = state.userMessageOnNextPage(pageno)
    assistant_text = state.assistantMessageAtPage(pageno)
    App.render()

    if (assistant_text == undefined) {
        assistant_text = await state.executePrompt(user_text, streamUpdater)
        state.appendAssistantMessage(assistant_text)

        App.untransitionUI()
        App.render()
    }
    else {
        App.untransitionUI()
    }
}

export const fetch = (args: string[] | undefined) => {
    gameid = (args ? args[0] : "");
    pageno = +(args ? (args[1] != undefined ? args[1] : "new") : "new");
    isNew = isNaN(pageno)

    if (isNew) {
        assistant_text = null
        next_user_text = null

        state.fetch_game_definition(gameid)
            .then((payload: any) => {
                mystate = Misc.clone(payload) as GameDefinition
                state.resetMessages()
                Router.goto(`#/story/${gameid}/0`, 1)
            })
    }
    else {
        App.prepareRender(NS, "Story", "screen_story")
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
    state.appendUserMessage(next_user_text!, pageno)

    next_user_text = null
    assistant_text = null

    Router.goto(`#/story/${gameid}/${pageno + 1}`)
}
