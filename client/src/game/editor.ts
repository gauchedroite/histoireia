import * as App from "../core/app.js"
import * as Router from "../core/router.js"
import * as Misc from "../core/misc.js"
import * as Theme from "../core/theme/theme.js"
import { state, GameDefinition as IState } from "./state.js"

export const NS = "GED";
const ns = NS.toLowerCase();


let mystate: IState = <IState>{};
let gameid: string = ""
let isNew = false;
let modalWhat: string | null = null



const formTemplate = (item: IState) => {
    const add = (row: string) => rows.push(row);
    let rows: string[] = [];

    //add(Theme.renderFieldText(NS, "code", item.code, "Code", <Theme.IOptText>{ maxlength: 10, required: true }))
    add(Theme.renderFieldText(NS, "title", item.title, "Titre", <Theme.IOptText>{ maxlength: 32, required: true }))

    add(Theme.renderFieldTextarea(NS, "prompt", item.prompt, "Prompt", <Theme.IOptText>{ maxlength: 8192, required: true, rows: 22 }))

    if (isNew) {
        add(`<button type="button" class="button" onclick="${NS}.save_story()"><i class="fa-solid fa-sparkles"></i>&nbsp;Enregistrer la nouvelle histoire</button>`)
    }
    else {
        add(`<button type="button" class="button save" onclick="${NS}.save_story()"><i class="fa-light fa-floppy-disk"></i>&nbsp;Enregistrer les changements</button>`)
    }

    return rows.join("");
}

const layout_Modal = () => {
    if (modalWhat == undefined)
        return ""

    return `
    <div class="modal-overlay modal-overlay-visible" onclick="${NS}.cancelModal()"></div>
    <div class="modal" style="display: block; margin-top: -62px;">
        <div class="modal-inner">
            <div class="modal-title"><b>Effacer l'histoire</b></div>
            <div class="modal-text">Es-tu certain ?</div>
        </div>
        <div class="modal-buttons modal-buttons-2">
            <span class="modal-button" onclick="${NS}.cancelModal()">Non</span>
            <span class="modal-button modal-button-bold" onclick="${NS}.executeModal()"><i class="fa-regular fa-check"></i>&nbsp;Oui</span>
        </div>
    </div>
`
}

const pageTemplate = (form: string, modal: string) =>{
    const returnurl = isNew ? "#/home" : `#/menu/${gameid}`;
    const trash = !isNew ? `<a href="#" onclick="${NS}.openModal('sitid');return false;"><i class="fa-regular fa-trash-can"></i></a>` : ""

    return `
<div class="app-header">
    <a href="${returnurl}">
        <i class="fa-regular fa-chevron-left"></i>&nbsp;${mystate.title}
    </a>
    ${trash}
    
</div>
<div class="app-content">
    ${form}
</div>
${modal}
`
}



export const fetch = (args: string[] | undefined) => {
    gameid = (args ? args[0] : "")
    isNew = (gameid == "new")
    App.prepareRender(NS, "Editor", "screen_editor")

    if (!isNew) {
        state.fetch_game_definition(gameid)
            .then(payload => {
                 mystate = Misc.clone(payload) as IState
            })
            .then(App.untransitionUI)
            .then(App.render)
            .catch(App.render);
    }
    else {
        state.new_game_definition()
        mystate = Misc.clone(state.game_definition) as IState
        Promise.resolve()
            .then(App.untransitionUI)
            .then(App.render)
    }
}

export const refresh = () => {
    App.transitionUI()
    state.fetch_game_definition(gameid)
    .then(payload => {
         mystate = Misc.clone(payload) as IState
    })
    .then(App.untransitionUI)
    .then(App.render)
    .catch(App.render);
}


export const render = () => {
    if (!App.inContext(NS)) return "";

    const form = formTemplate(mystate);
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



const getFormState = () => {
    let clone = Misc.clone(mystate) as IState;
    clone.code = Misc.fromInputText(`${NS}_code`, mystate.code);
    clone.title = Misc.fromInputText(`${NS}_title`, mystate.title);
    clone.prompt = Misc.fromInputText(`${NS}_prompt`, mystate.prompt);
    return clone;
}

export const onchange = (input: HTMLInputElement) => {
    mystate = getFormState();
    App.render();
}


export const save_story = async () => {
    gameid = await state.save_story(mystate)
    isNew = false;
    refresh()
}



export const openModal = (what: string) => {
    modalWhat = what
    App.renderOnNextTick()
}

export const cancelModal = () => {
    modalWhat = null
    App.renderOnNextTick()
}

export const executeModal = async () => {
    modalWhat = null
    const message = await state.delete_story(gameid)
    //Misc.toastSuccess(message)
    Router.goto(`#/home`)
}
