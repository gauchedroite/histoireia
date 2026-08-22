import * as App from "../core/app.js"
import * as Misc from "../core/misc.js"
import * as Theme from "../core/theme/theme.js"
import * as Lookup from "../lookupdata.js"
import type { GameDefinition } from "../games/state.js"

// Standalone admin editor (loaded by editor.html). Edits both kinds.
// Security is handled outside the app (Caddy gates /histoireia/editor*); these
// /editor/* endpoints have NO Express auth by design.
export const NS = "ED";

type GameSummary = { code: string; title: string; kindid: number; author?: string; template: boolean };

let games: GameSummary[] = [];
let editing: GameDefinition | null = null;
let gameid = "";
let isNew = false;
let view: "list" | "edit" = "list";
let modalWhat: string | null = null;
let error: string | null = null;


// ---------------- list view ----------------
const renderList = () => {
    const kinds = Lookup.get_kind();
    const rows = games.map(g => {
        const kindText = kinds?.find(k => k.id == g.kindid)?.description ?? "";
        const badge = g.template
            ? `<span class="badge">modèle</span>`
            : (g.author ? `<span class="badge badge-user">${g.author}</span>` : "");
        return `<tr>
            <td><a href="#" onclick="${NS}.open('${g.code}');return false;">${g.title}</a></td>
            <td>${kindText}</td>
            <td>${badge}</td>
        </tr>`;
    }).join("");

    return `<div class="ed-wrap">
<div class="ed-header">
    <h1>Éditeur</h1>
    <a href="#" class="button" onclick="${NS}.open('new');return false;"><i class="fa-solid fa-plus"></i>&nbsp;Nouvelle histoire</a>
</div>
${error ? `<div class="ed-error">${error}</div>` : ""}
<table class="ed-table">
    <thead><tr><th>Titre</th><th>Type</th><th>Propriétaire</th></tr></thead>
    <tbody>${rows}</tbody>
</table>
</div>`;
}


// ---------------- edit view ----------------
const formTemplate = () => {
    const item = editing!;
    const lookupLlm = Lookup.get_llm();
    const lookupKind = Lookup.get_kind();
    const llmidOptions = Theme.renderOptions(lookupLlm!, item.llmid, isNew);
    const kindidOptions = Theme.renderOptions(lookupKind!, item.kindid, isNew);
    const kindText = lookupKind?.find(k => k.id == item.kindid)?.description ?? "";
    const isAdv = item.kindid == Lookup.LUID_KIND_ADV;

    let rows: string[] = [];
    const add = (r: string) => rows.push(r);

    add(Theme.renderFieldText(NS, "title", item.title, `Titre <div class="code">${item.code}</div>`, <Theme.IOptText>{ maxlength: 32, required: true }));

    // Kind is selectable on a new game, fixed afterwards (file format differs)
    add(isNew
        ? Theme.renderFieldDropdown(NS, "kindid", kindidOptions, kindText, "Type d'histoire", <Theme.IOptDropdown>{ required: true })
        : Theme.renderFieldDropdown(NS, "kindid", kindidOptions, kindText, "Type d'histoire", <Theme.IOptDropdown>{ required: true, readonly: true }));

    if (!isAdv) {
        add(Theme.renderFieldTextarea(NS, "prompt", item.prompt, "Prompt", <Theme.IOptText>{ maxlength: 8192, required: true, rows: 14 }));
        add(Theme.renderFieldText(NS, "extra", item.extra, "Extra", <Theme.IOptText>{}));
        add(Theme.renderFieldDropdown(NS, "llmid", llmidOptions, "", "LLM (modèle)", <Theme.IOptDropdown>{ required: true }));
    }
    else {
        add(Theme.renderFieldTextarea(NS, "prompt", item.prompt, "Données (TSV)", <Theme.IOptText>{ required: true, rows: 18 }));
    }

    add(Theme.renderFieldText(NS, "bg_image", item.bg_image, "Image de la page titre", <Theme.IOptText>{ maxlength: 32 }));

    return rows.join("");
}

const renderModal = () => {
    if (!modalWhat) return "";
    return `
<div class="modal-overlay modal-overlay-visible" onclick="${NS}.cancelModal()"></div>
<div class="modal" style="display:block; margin-top:-62px;">
    <div class="modal-inner">
        <div class="modal-title"><b>Effacer l'histoire</b></div>
        <div class="modal-text">Es-tu certain ?</div>
    </div>
    <div class="modal-buttons modal-buttons-2">
        <span class="modal-button" onclick="${NS}.cancelModal()">Non</span>
        <span class="modal-button modal-button-bold" onclick="${NS}.confirmDelete()"><i class="fa-regular fa-check"></i>&nbsp;Oui</span>
    </div>
</div>`;
}

const renderEdit = () => {
    const form = editing ? formTemplate() : "";
    const trash = !isNew ? `<a href="#" class="button danger" onclick="${NS}.openModal();return false;"><i class="fa-thin fa-trash-can"></i></a>` : "";
    return `<div class="ed-wrap">
<div class="ed-header">
    <a href="#" onclick="${NS}.back();return false;"><i class="fa-regular fa-chevron-left"></i>&nbsp;Liste</a>
    <span>${editing?.title ?? ""}</span>
    ${trash}
</div>
<div class="ed-content">
    <form onsubmit="return false;">
        <input type="submit" style="display:none;" id="${NS}_dummy_submit">
        ${form}
        <br>
        <button type="button" class="button save" onclick="${NS}.save()"><i class="fa-light fa-floppy-disk"></i>&nbsp;Enregistrer</button>
    </form>
</div>
</div>
${renderModal()}`;
}


export const render = () => {
    if (!App.inContext(NS)) return "";
    return view == "list" ? renderList() : renderEdit();
}

export const postRender = () => {
    if (!App.inContext(NS)) return;
    if (modalWhat) {
        setTimeout(() => {
            document.querySelector(`.modal`)?.classList.add("modal-in");
        }, 50);
    }
}


// ---------------- data ----------------
const loadList = () =>
    App.GET(`editor/stories`)
        .then((list: any) => { games = list as GameSummary[]; error = null; })
        .catch(() => { error = "Impossible de charger la liste."; });

const loadOne = (id: string) =>
    App.GET(`editor/stories/${id}`)
        .then((def: any) => { editing = def as GameDefinition; error = null; });

const newGame = () => {
    editing = <GameDefinition>{
        code: "new", title: "Nouvelle histoire", bg_url: null, bg_image: null,
        prompt: "Tu es un assistant utile.", llmid: 1, llmid_text: "", kindid: 1, kindid_text: "",
        extra: null, hasJsonSchema: false
    };
}


export const fetch = () => {
    view = "list";
    App.prepareRender(NS, "Éditeur", "app_root");
    Promise.all([Lookup.fetch_kind(), loadList()])
        .then(App.untransitionUI)
        .then(App.render)
        .catch(App.render);
}

export const open = (id: string) => {
    gameid = id;
    isNew = (id == "new");
    view = "edit";
    modalWhat = null;
    App.prepareRender(NS, "Éditeur", "app_root");
    const load = isNew ? Promise.resolve(newGame()) : loadOne(id);
    Promise.all([Lookup.fetch_kind(), Lookup.fetch_llm(), load])
        .then(App.untransitionUI)
        .then(App.render)
        .catch(App.render);
}

export const back = () => {
    view = "list";
    modalWhat = null;
    App.prepareRender(NS, "Éditeur", "app_root");
    loadList().then(App.untransitionUI).then(App.render).catch(App.render);
}


const getFormState = () => {
    const clone = Misc.clone(editing) as GameDefinition;
    clone.title = Misc.fromInputText(`${NS}_title`, editing!.title);
    clone.bg_image = Misc.fromInputText(`${NS}_bg_image`, editing!.bg_image);
    clone.prompt = Misc.fromInputText(`${NS}_prompt`, editing!.prompt);
    clone.llmid = Misc.fromSelectNumber(`${NS}_llmid`, editing!.llmid);
    clone.kindid = Misc.fromSelectNumber(`${NS}_kindid`, editing!.kindid);
    clone.extra = Misc.fromInputText(`${NS}_extra`, editing!.extra);
    return clone;
}

export const onchange = (_input: HTMLInputElement) => {
    if (editing) editing = getFormState();
    App.render();
}

export const save = () => {
    if (!Misc.html5Valid(NS)) return;
    const def = getFormState();
    App.transitionUI();
    App.PUT(`editor/stories/${gameid}`, def)
        .then((payload: any) => {
            gameid = payload.gameid;
            isNew = false;
            Misc.toastSuccess("Changements sauvegardés");
            back();
        })
        .catch(App.render);
}

export const openModal = () => { modalWhat = "delete"; App.renderOnNextTick(); }
export const cancelModal = () => { modalWhat = null; App.renderOnNextTick(); }

export const confirmDelete = () => {
    modalWhat = null;
    App.transitionUI();
    App.DELETE(`editor/stories/${gameid}`, {})
        .then(() => { Misc.toastSuccess("Le livre a été effacé!"); back(); })
        .catch(App.render);
}
