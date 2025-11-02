import * as App from "../../core/app.js"
import * as Router from "../../core/router.js"
import * as Misc from "../../core/misc.js"
import { state, GameDefinition, GameState } from "./state.js"

export const NS = "GMENU2";
const ns = NS.toLowerCase()


let mystate: GameDefinition
let gameid = ""
let lastPage = 0;
let modalWhat: string | null = null



const formTemplate = () => {
    const add = (row: string) => rows.push(row);
    const action = (href: string, text: string, icon: string) => rows.push(`<a href="${href}"><div><div>${text}</div>${icon}</div></a>`);
    const page = (index: number, text: string) => rows.push(`<a href="#/story2/${gameid}/${index}" class="page ${index == 0 ? "page-0" : ""}"><div><div>${text}</div><span>p.${index+1}</span></div></a>`);
    let rows: string[] = [];

    if (mystate.bg_url) {
        add(`<a href="#/story2/${gameid}/${lastPage}">
                <div class="cover image" style="background-image:url(${mystate.bg_url})">
                    <br><div class="title">${mystate.title}</div>
                </div>
            </a>`)
    }
    else {
        add(`<a href="#/story2/${gameid}/${lastPage}">
                <div class="cover">
                    <br><div class="title">${mystate.title}</div><br>
                </div>
            </a>`)
    }
    add(`<div class="app-list">`)

    if (lastPage == -1) {
        action(`#/story2/${gameid}/new`, "Lire à partir du début", `<i class="fa-thin fa-book-user"></i>`)
    }
    else {
        action(`#/story2/${gameid}/${lastPage}`, "Continuer la lecture", `<i class="fa-thin fa-book-open-reader"></i>`)
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

    Promise.all
        ([
            state.fetchGameDefinitionAsync(gameid),
            state.fetchGameStateAsync(gameid)
        ])
        .then(payloads => {
            mystate = Misc.clone(payloads[0]) as GameDefinition
            lastPage = (payloads[1] as GameState).currentid
        })
        .then(App.untransitionUI)
        .then(App.render)
        .catch(App.render);
}

export const render = () => {
    if (!App.inContext(NS)) return "";
    //if (state.pages() == undefined) return ""

    const form = formTemplate()
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
    Router.goto(`#/story2/${gameid}/new`)
}
