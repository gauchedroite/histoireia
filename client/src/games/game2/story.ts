import * as App from "../../core/app.js"
import * as Router from "../../core/router.js"
import * as Misc from "../../core/misc.js"
import * as Theme from "../../core/theme/theme.js"
import { state, GameDefinition } from "./state.js"

export const NS = "GSTORY2";


let mystate: GameDefinition
let gameid = ""
let lineId = 0
let lastLineId = 0
let isNew = false



const formTemplate = () => {
    const add = (row: string) => rows.push(row);
    let rows: string[] = [];
    
    return rows.join("")
}

const pageTemplate = (form: string) => {
    return `
<div class="app-header">
    <a class="js-waitable-2" href="#/menu/${gameid}">
        <i class="fa-regular fa-chevron-left"></i>&nbsp;<span>${mystate.title}</span>
    </a>
</div>
<div class="app-content js-waitable-2">
    ${form}
</div>
`
}


export const fetch = (args: string[] | undefined) => {
    gameid = (args ? args[0] : "");
    lineId = +(args ? (args[1] != undefined ? args[1] : "new") : "new");
    isNew = isNaN(lineId)

    if (isNew) {
        Promise.all
            ([
                state.fetchGameDefinitionAsync(gameid),
                state.fetchStorySoFarAsync(gameid)
            ])
            .then((payloads: any) => {
                mystate = Misc.clone(payloads[0]) as GameDefinition
            })
            .then(() => { state.resetMessagesAsync() })
            .then(() => { Router.goto(`#/story2/${gameid}/0`, 1) })
    }
    else {
        App.prepareRender(NS, "Story", "screen_story")
        Promise.all
            ([
                state.fetchGameDefinitionAsync(gameid),
                state.fetchStorySoFarAsync(gameid)
            ])
            .then((payloads: any) => {
                mystate = Misc.clone(payloads[0]) as GameDefinition
            })
            .then(App.render)
            .catch(App.render)
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
}



export const onchange = (input: HTMLInputElement) => {
    getFormState();
    App.render();
}

export const oninput = (input: HTMLInputElement) => {
    getFormState();
    App.render();
}
