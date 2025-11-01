import * as App from "../../core/app.js"
import * as Router from "../../core/router.js"
import { state } from "./state.js"
import { runner, ISituationUI, IConsequenceUI } from "./runner.js"

export const NS = "GSTORY2";


let gameid = ""
let situationId = 0
let selectedChoice = -1
let step = 1
let isNew = false



const choiceTemplate = (i: number, text: string) => {
    return `<h1 onclick="${NS}.onChoice(${i})">${text}</h1>`;
}

const questionTemplate = (s: ISituationUI, choiceHtml: string) => {
    const add = (row: string) => rows.push(row);
    let rows: string[] = [];

    add(`<h1>${s.title}</h1>`)
    add(`<br>`)
    add(choiceHtml)
    add(`<br>`)
    
    return rows.join("")
}

const consequenceTemplate = (s: IConsequenceUI) => {
    const add = (row: string) => rows.push(row);
    let rows: string[] = [];

    add(`<h1>${s.title}</h1>`)
    add(`<h1>${s.choice}</h1>`)
    add(`<h1>${s.consequence}</h1>`)
    
    return rows.join("")
}

const pageTemplate = (form: string, showConsequence: boolean) => {
    const pageclick = showConsequence ? `onclick="${NS}.onConsequence()"` : ``
    return `
<div class="app-header">
    <a class="js-waitable-2" href="#/menu2/${gameid}">
        <i class="fa-regular fa-chevron-left"></i>&nbsp;<span>${state.game_definition.title}</span>
    </a>
</div>
<div class="app-content js-waitable-2" ${pageclick}>
    ${form}
</div>
`
}



export const fetch = (args: string[] | undefined) => {
    gameid = (args ? args[0] : "");
    situationId = +(args ? (args[1] != undefined ? args[1] : "new") : "new");
    isNew = isNaN(situationId)

    if (isNew) {
        Promise.all
            ([
                state.fetchGameDefinitionAsync(gameid),
                state.resetGameStateAsync()
            ])
            .then((payloads: any) => {
                situationId = 1;
                runner.Initialize(state.game_definition.prompt!)
            })
            .then(() => { Router.goto(`#/story2/${gameid}/${situationId}`, 1) })
    }
    else {
        App.prepareRender(NS, "Story", "screen_story")
        Promise.all
            ([
                state.fetchGameDefinitionAsync(gameid),
                //state.fetchGameStateAsync(gameid)
            ])
            .then((payloads: any) => {
                runner.Initialize(state.game_definition.prompt!)
                // apply the user state
            })
            .then(App.render)
            .catch(App.render)
    }
}



export const render = () => {
    if (!App.inContext(NS)) return "";

    let form = ""
    let isConsequence = false;

    if (step == 1) {
        const s = runner.GetSituation(situationId);
        const choiceHtml = [0, 1].map(i => choiceTemplate(i, s.choices[i].choice)).join('');
        form = questionTemplate(s, choiceHtml)
    }
    else if (step == 2) {
        const res = runner.GetConsequence(situationId, selectedChoice);
        const { newid, end } = runner.NextSituation(situationId, selectedChoice);

        // LES CHANGEMENTS DE STATE DEVRAIENT SE FAIRE DANS UN ONLICK() EVENT
        // DE FAÇON À CE QU'UN F5 NE CHANGE PAS LE STATE
        form = consequenceTemplate(res)

        situationId = newid
        step = 1
        isConsequence = true
    }

    return pageTemplate(form, isConsequence)
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

export const onChoice = (i: number) => {
    selectedChoice = i
    step = 2
    App.renderOnNextTick();
}

export const onConsequence = () => {
    App.renderOnNextTick();
}