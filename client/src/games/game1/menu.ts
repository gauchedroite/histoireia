import * as App from "../../core/app.js"
import * as Router from "../../core/router.js"
import * as Misc from "../../core/misc.js"
import { state } from "./state.js"
import { GameDefinition } from "./state.js"

export const NS = "GMENU";
const ns = NS.toLowerCase()


let mystate: GameDefinition
let gameid = ""
let lastPage = 0;
let modalWhat: string | null = null



const formTemplate = () => {
    const add = (row: string) => rows.push(row);
    const action = (href: string, text: string, icon: string) => rows.push(`<a href="${href}"><div><div>${text}</div>${icon}</div></a>`);
    const page = (index: number, text: string) => rows.push(`<a href="#/story/${gameid}/${index}" class="page ${index == 0 ? "page-0" : ""}"><div><div>${text}</div><span>p.${index+1}</span></div></a>`);
    let rows: string[] = [];

    if (mystate.bg_url) {
        add(`<a href="#/story/${gameid}/${lastPage}">
                <div class="cover image" style="background-image:url(${mystate.bg_url})">
                    <br><div class="title">${mystate.title}</div>
                </div>
            </a>`)
    }
    else {
        add(`<a href="#/story/${gameid}/${lastPage}">
                <div class="cover">
                    <br><div class="title">${mystate.title}</div><br>
                </div>
            </a>`)
    }
    add(`<div class="app-list">`)

    if (lastPage == -1) {
        action(`#/story/${gameid}/new`, "Commencer la lecture", `<i class="fa-thin fa-book-user"></i>`)
    }
    else {
        action(`#/story/${gameid}/${lastPage}`, "Continuer la lecture", `<i class="fa-thin fa-book-open-reader"></i>`)

        state.pages().forEach((one, index) => page(index, (index == 0 ? mystate.title! : one.user)))

        action(`#" onclick="${NS}.openModal('sitid');return false;`, "Recommencer l'histoire?", `<i class="fa-thin fa-arrow-rotate-left"></i>`)
        action(`#" onclick="${NS}.addInstance();return false;`, "Ajouter une histoire", `<i class="fa-thin fa-book-sparkles"></i>`)
        if (mystate.isInstance)
            action(`#" onclick="${NS}.openModal('delete');return false;`, "Effacer cette histoire", `<i class="fa-thin fa-trash-can"></i>`)
    }
    add("</div>")
    return rows.join("")
}

const layout_Modal = () => {
    if (modalWhat == undefined)
        return ""

    const isDelete = modalWhat == 'delete'
    const title = isDelete ? "Effacer l'histoire" : "Recommencer l'histoire"
    const text = isDelete ? "Cette action est irréversible." : "Es-tu certain ?"
    const confirmIcon = isDelete ? `<i class="fa-regular fa-trash"></i>` : `<i class="fa-regular fa-check"></i>`

    return `
    <div class="modal-overlay modal-overlay-visible" onclick="${NS}.cancelModal()"></div>
    <div class="modal" style="display: block; margin-top: -62px;">
        <div class="modal-inner">
            <div class="modal-title"><b>${title}</b></div>
            <div class="modal-text">${text}</div>
        </div>
        <div class="modal-buttons modal-buttons-2">
            <span class="modal-button" onclick="${NS}.cancelModal()">Non</span>
            <span class="modal-button modal-button-bold" onclick="${NS}.executeModal()">${confirmIcon}&nbsp;Oui</span>
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
            state.fetchStorySoFarAsync(gameid)
        ])
        .then(payloads => {
            mystate = Misc.clone(payloads[0]) as GameDefinition
            lastPage = state.lastPageNo()
        })
        .then(App.untransitionUI)
        .then(App.render)
        .catch(App.render);
}

export const render = () => {
    if (!App.inContext(NS)) return "";
    if (state.pages() == undefined) return ""

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
    const what = modalWhat
    modalWhat = null
    if (what == 'delete') {
        App.transitionUI();
        state.deleteInstanceAsync(gameid)
            .then(() => { Misc.toastSuccess("Histoire effacée!"); Router.goto(`#/home`); })
            .catch(App.render);
        return;
    }
    App.renderOnNextTick()
    Router.goto(`#/story/${gameid}/new`)
}

// Create a new blank instance of the current game for this user, then jump to
// its menu ("Commencer la lecture"). The instance is private to the user.
export const addInstance = () => {
    if (gameid == "") return;
    App.transitionUI();
    state.addInstanceAsync(gameid)
        .then((payload: { instanceid: string }) => {
            Misc.toastSuccess("Histoire ajoutée à ta bibliothèque!");
            Router.goto(`#/menu/${payload.instanceid}`);
        })
        .catch(App.render);
}
