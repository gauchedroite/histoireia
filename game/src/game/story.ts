import * as App from "../core/app.js"
import * as Misc from "../core/misc.js"
import { state, GameDefinition as IState, Message } from "./state.js"

export const NS = "GSTORY";


let mystate: IState
let mystate2: Message[]
let gameid = ""



const formTemplate = (messages: Message[]) => {
    return ``
}

const pageTemplate = (form: string) => {
    return `
<div>
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



export const fetch = (args: string[] | undefined) => {
    gameid = (args ? args[0] : "");
    App.prepareRender(NS, "Story", "game_story")
    state.fetch_game_definition(gameid)
        .then((payload: any) =>{
            mystate = Misc.clone(payload) as IState
            mystate2 = state.getMessages()
        })
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
