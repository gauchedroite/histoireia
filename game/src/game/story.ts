import * as App from "../core/app.js"
import * as Misc from "../core/misc.js"
import { waitAsync } from "../utils.js";
import { state, GameDefinition as IState, Message } from "./state.js"

export const NS = "GSTORY";


let mystate: IState
let gameid = ""
let pageno = 0
let assistant_text = ""



const formTemplate = () => {
    return `
<div>
    ${assistant_text}
</div>
`
}

const pageTemplate = (form: string) => {
    return `
<div class="js-waitable">
    <h2>
        <a href="#/menu/${gameid}"><i class="fa-solid fa-arrow-left"></i></a>
        <span>${mystate.title}</span>
    </h2>
</div>
<div class="form">
${form}
</div>
`
}


const render_and_fetch_more = async () => {
    App.render() // pour afficher le titre au minimum

    const messages = state.getMessages();
    const prompt = (messages.length == 0 ? mystate.prompt : messages[pageno * 2].content)!;

    assistant_text = await state.executePrompt(prompt)

    App.untransitionUI()
    App.render()
}

export const fetch = (args: string[] | undefined) => {
    gameid = (args ? args[0] : "");
    pageno = +(args ? (args[1] != undefined ? args[1] : "0") : "0");
    App.prepareRender(NS, "Story", "game_story")
    state.fetch_game_definition(gameid)
        .then((payload: any) => {
            mystate = Misc.clone(payload) as IState
        })
        .then(render_and_fetch_more)
        .catch(render_and_fetch_more)
}

export const render = () => {
    if (!App.inContext(NS)) return "";

    const form = formTemplate()
    return pageTemplate(form)
}

export const postRender = () => {
    if (!App.inContext(NS)) return
}
