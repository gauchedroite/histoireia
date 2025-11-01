import * as App from "../core/app.js"
import * as Router from "../core/router.js"
import * as Misc from "../core/misc.js"
import * as Theme from "../core/theme/theme.js"
import { state, GameDefinition } from "./state.js"
import * as Lookup from "../lookupdata.js"

export const NS = "GED";
const ns = NS.toLowerCase();


let mystate: GameDefinition = <GameDefinition>{};
let gameid: string = ""
let isNew = false;
let modalWhat: string | null = null



const formTemplate = (item: GameDefinition, llmid: string, kindid: string) => {
    const add = (row: string) => rows.push(row);
    let rows: string[] = [];

    const amAuthor = (item.author == state.username)

    add(Theme.renderFieldText(NS, "title", item.title, `Titre <div class="code">${item.code}</div>`, <Theme.IOptText>{ maxlength: 32, required: true }))
    add(Theme.renderFieldDropdown(NS, "kindid", kindid, item.kindid_text, "Type d'histoire", <Theme.IOptDropdown>{ required: true }))

    if (item.kindid != Lookup.LUID_KIND_ADV) {
        add(Theme.renderFieldTextarea(NS, "prompt", item.prompt, "Prompt", <Theme.IOptText>{ maxlength: 8192, required: true, rows: 10 }))

        add(Theme.renderFieldText(NS, "extra", item.extra, "Extra", <Theme.IOptText>{}))
        add(Theme.renderFieldDropdown(NS, "llmid", llmid, item.llmid_text, "LLM", <Theme.IOptDropdown>{ required: true }))
    }

    add(Theme.renderFieldText(NS, "bg_image", item.bg_image, "Image de la page titre", <Theme.IOptText>{ maxlength: 32 }))

    if (amAuthor)
        add(Theme.renderFieldCheckbox(NS, "justme", item.justme, "", "Privé: seulement pour moi!", <Theme.IOpt>{}))

    add(`<br><br>`);
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
    const trash = !isNew ? `<a href="#" onclick="${NS}.openModal('sitid');return false;"><i class="fa-thin fa-trash-can"></i></a>` : ""

    return `
<div class="app-header">
    <a href="${returnurl}">
        <i class="fa-regular fa-chevron-left"></i>&nbsp;<span>${mystate.title}</span>
    </a>
    ${trash}
    
</div>
<div class="app-content">
    ${form}
</div>
${modal}
`
}



const fetchState = () => {
    isNew = (gameid == "new")

    if (!isNew) {
        return state.fetchGameDefinitionAsync(gameid)
            .then(payload => {
                 mystate = Misc.clone(payload) as GameDefinition
            })
            //.then(waitTwoSecondAsync)
            .then(Lookup.fetch_llm)
            .then(Lookup.fetch_kind)
            .then(App.untransitionUI)
    }
    else {
        state.newStory()
        mystate = Misc.clone(state.game_definition) as GameDefinition
        return Promise.resolve()
            .then(Lookup.fetch_llm)
            .then(Lookup.fetch_kind)
            .then(App.untransitionUI)
    }
}

export const fetch = (args: string[] | undefined) => {
    gameid = (args ? args[0] : "")
    App.prepareRender(NS, "Editor", "screen_editor")
    fetchState()
        .then(App.render)
        .catch(App.render);
}

export const refresh = () => {
    App.transitionUI()
    state.fetchGameDefinitionAsync(gameid)
    .then(payload => {
         mystate = Misc.clone(payload) as GameDefinition
    })
    .then(App.untransitionUI)
    .then(App.render)
    .catch(App.render);
}


export const render = () => {
    if (!App.inContext(NS)) return "";

    const lookup_llm = Lookup.get_llm();
    const lookup_kind = Lookup.get_kind();
    let llmid = Theme.renderOptions(lookup_llm, mystate.llmid, isNew);
    let kindid = Theme.renderOptions(lookup_kind, mystate.kindid, isNew);

    const form = formTemplate(mystate, llmid, kindid);
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
    let clone = Misc.clone(mystate) as GameDefinition;
    clone.code = Misc.fromInputText(`${NS}_code`, mystate.code);
    clone.title = Misc.fromInputText(`${NS}_title`, mystate.title);
    clone.bg_image = Misc.fromInputText(`${NS}_bg_image`, mystate.bg_image);
    clone.prompt = Misc.fromInputText(`${NS}_prompt`, mystate.prompt);
    clone.llmid = Misc.fromSelectNumber(`${NS}_llmid`, mystate.llmid);
    clone.kindid = Misc.fromSelectNumber(`${NS}_kindid`, mystate.kindid);
    clone.extra = Misc.fromInputText(`${NS}_extra`, mystate.extra);
    clone.justme = Misc.fromInputCheckbox(`${NS}_justme`, mystate.justme);
    return clone;
}

export const onchange = (input: HTMLInputElement) => {
    mystate = getFormState();
    App.render();
}


export const save_story = async () => {
    state.saveStoryAsync(mystate)
        .then((payload: any) => {
            gameid = payload.gameid
            isNew = false;
            Misc.toastSuccess("Changements sauvegardés")
            refresh()
        })
        .catch(App.render)
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
    state.deleteStoryAsync()
        .then(() => {
            Misc.toastSuccess("Le livre a été effacé!")
            //App.popRenderStack()
            Router.goto(`#/home`)
        })
        .catch(App.render)
}
