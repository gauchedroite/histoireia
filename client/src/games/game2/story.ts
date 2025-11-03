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
    return `<h3 onclick="${NS}.onChoice(${i})">${text}</h3>`;
}

const questionTemplate = (s: ISituationUI, choiceHtml: string) => {
    const add = (row: string) => rows.push(row);
    let rows: string[] = [];

    add(`<div class="question" id="step_1">`)
    add(`<h1>${s.title}</h1>`)
    add(`<div class="answers">`)
    add(choiceHtml)
    add(`</div>`)
    add(`</div>`)
    
    return rows.join("")
}

const consequenceTemplate = (s: IConsequenceUI) => {
    const add = (row: string) => rows.push(row);
    let rows: string[] = [];

    add(`<div class="consequence" id="step_2">`)
    add(`<h1>${s.title}</h1>`)
    add(`<h2>${s.choice}</h2>`)
    add(`<h2 class="standout">${s.consequence}</h2>`)
    if (s.end)
        add(`<h2>Fin.</h2>`)
    if (s.gameover)
        add(`<h2>Game Over.</h2>`)
    add(`</div>`)
    
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
    selectedChoice = -1
    step = 1

    isNew = isNaN(situationId)

    if (isNew) {
        situationId = 0
        
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
                state.fetchGameStateAsync(gameid)
            ])
            .then((payloads: any) => {
                runner.Initialize(state.game_definition.prompt!)
                runner.SetState(state.game_state.allows)
            })
            .then(App.render)
            .catch(App.render)
    }
}



export const render = () => {
    if (!App.inContext(NS)) return "";

    let form = ""

    if (step == 1) {
        const s = runner.GetSituation(situationId);
        const choiceHtml = [0, 1].map(i => choiceTemplate(i, s.choices[i].choice)).join('');
        form = questionTemplate(s, choiceHtml)
    }
    else if (step == 2) {
        const res = runner.GetConsequence(situationId, selectedChoice);
        form = consequenceTemplate(res)
    }

    return pageTemplate(form, step == 2)
}

export const postRender = () => {
    if (!App.inContext(NS)) return
    const content = document.querySelector(".app-content");
    if (content) {
        setTimeout(() => { content.classList.add(`fadin`) }, 125);
    }
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

export const onConsequence = async () => {
    situationId = runner.NextSituation(situationId, selectedChoice);
    step = 1

    const runnerState = runner.GetState()
    await state.saveGameStateAsync(situationId, runnerState)

    const content = document.querySelector(".app-content");
    if (content) {
        setTimeout(() => { content.classList.add(`fadout`) }, 10);
        setTimeout(() => { App.render() }, 250);
    }
    else {
        App.render();
    }
}