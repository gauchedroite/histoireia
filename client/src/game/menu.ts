import * as App from "../core/app.js"
import * as Router from "../core/router.js"
import * as Misc from "../core/misc.js"
import { state, GameDefinition as IState, Message } from "./state.js"

export const NS = "GMENU";
const ns = NS.toLowerCase()


let mystate: IState
let mystate2: Message[]
let gameid = ""
let modalWhat: string | null = null



const formTemplate = (messages: Message[]) => {
    const add = (row: string) => rows.push(row);
    const action = (href: string, text: string, icon: string) => rows.push(`<a href="${href}"><div><div>${text}</div>${icon}</div></a>`);
    let rows: string[] = [];

    const lastPage = state.lastPageNo()

    add(`<div class="title">${mystate.title}</div>`)
    add(`<div class="app-list">`)

    if (lastPage == -1) {
        action(`#/story/${gameid}/new`, "Commencer à lire", `<i class="fa-thin fa-book-user"></i>`)
    }
    else {
        action(`#/story/${gameid}/${lastPage}`, "Continuer à lire", `<i class="fa-thin fa-book-open-reader"></i>`)
        action(`#" onclick="${NS}.openModal('sitid');return false;`, "Recommencer le livre?", `<i class="fa-thin fa-arrow-rotate-left"></i>`)
    }
    action(`#/editor/${gameid}`, "Éditeur", `<i class="fa-thin fa-pen-to-square"></i>`)

    add("</div>")
    return rows.join("")
}

const layout_Modal = () => {
    if (modalWhat == undefined)
        return ""

    return `
    <div class="modal-overlay modal-overlay-visible" onclick="${NS}.cancelModal()"></div>
    <div class="modal" style="display: block; margin-top: -62px;">
        <div class="modal-inner">
            <div class="modal-title"><b>Recommencer l'histoire</b></div>
            <div class="modal-text">Es-tu certain ?</div>
        </div>
        <div class="modal-buttons modal-buttons-2">
            <span class="modal-button" onclick="${NS}.cancelModal()">Non</span>
            <span class="modal-button modal-button-bold" onclick="${NS}.executeModal()"><i class="fa-regular fa-check"></i>&nbsp;Oui</span>
        </div>
    </div>
`
}

const pageTemplate = (form: string, modal: string) => {
    return `
<div class="app-header">
    <a href="#/home">
        <i class="fa-regular fa-chevron-left"></i>&nbsp;Bibliothèque de ${state.usernameCapitalized}
    </a>
</div>
<div class="app-content">
    ${form}
</div>
${modal}
`
}



export const fetch = (args: string[] | undefined) => {
    gameid = (args ? args[0] : "");
    App.prepareRender(NS, "Menu", "screen_menu")
    state.fetch_game_definition(gameid)
        .then((payload: any) =>{
            mystate = Misc.clone(payload) as IState
            mystate2 = state.getMessages()
        })
        .then(App.untransitionUI)
        .then(App.render)
        .catch(App.render);
}

export const render = () => {
    if (!App.inContext(NS)) return "";

    const form = formTemplate(mystate2)
    const modal = layout_Modal()

    return pageTemplate(form, modal)
}

export const postRender = () => {
    if (!App.inContext(NS)) return

    if (modalWhat == undefined)
        return;

    setTimeout(() => {
        const modalOverlay = document.querySelector(`#${ns} .modal`) as HTMLElement;
        if (modalOverlay && !modalOverlay.classList.contains("modal-in"))
            modalOverlay.classList.add("modal-in")
    }, 50);
}



export const openModal = (what: string) => {
    modalWhat = what
    App.renderOnNextTick()
}

export const cancelModal = () => {
    modalWhat = null
    App.renderOnNextTick()
}

export const executeModal = () => {
    modalWhat = null
    App.renderOnNextTick()
    Router.goto(`#/story/${gameid}/new`)
}
