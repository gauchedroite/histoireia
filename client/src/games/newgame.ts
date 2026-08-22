import * as App from "../core/app.js"
import * as Router from "../core/router.js"
import * as Misc from "../core/misc.js"
import * as Lookup from "../lookupdata.js"
import { state } from "./state.js"

export const NS = "GNEW";

// ponytail: user never sets the model — only picks a kind + a story; the prompt
// (and the admin-chosen model) are copied from the template into a new instance.
let templates: { code: string; title: string; kindid: number }[] = [];
let kindid = 1;          // default "llm"
let templateid = "";     // selected template code


const formTemplate = () => {
    const kinds = Lookup.get_kind() ?? [];
    const kindOptions = kinds
        .map(k => `<option value="${k.id}" ${k.id == kindid ? "selected" : ""}>${k.description}</option>`)
        .join("");

    const stories = templates.filter(t => t.kindid == kindid);
    const storyOptions = (stories.length == 0
        ? `<option value="" selected disabled>(aucune histoire)</option>`
        : `<option value="" selected disabled>Choisis une histoire...</option>`
          + stories.map(t => `<option value="${t.code}" ${t.code == templateid ? "selected" : ""}>${t.title}</option>`).join(""));

    const canAdd = templateid != "";

    return `
<label>Type d'histoire
    <select id="${NS}_kindid" onchange="${NS}.onchange(this)">${kindOptions}</select>
</label>
<label>Histoire
    <select id="${NS}_templateid" onchange="${NS}.onchange(this)">${storyOptions}</select>
</label>
<br>
<button type="button" class="button" onclick="${NS}.submit()" ${canAdd ? "" : "disabled"}>
    <i class="fa-solid fa-sparkles"></i>&nbsp;Ajouter à ma bibliothèque
</button>
`
}

const pageTemplate = (form: string) => {
    return `
<div class="app-header">
    <a href="#/home"><i class="fa-regular fa-chevron-left"></i>&nbsp;Bibliothèque</a>
</div>
<div class="app-content">
    ${form}
</div>
`
}


export const fetch = () => {
    App.prepareRender(NS, "Nouvelle histoire", "screen_home")
    Promise.all([Lookup.fetch_kind(), state.fetchTemplatesAsync()])
        .then(([_k, t]) => { templates = t; })
        .then(App.untransitionUI)
        .then(App.render)
        .catch(App.render);
}

export const render = () => {
    if (!App.inContext(NS)) return "";
    return pageTemplate(formTemplate());
}

export const postRender = () => {
    if (!App.inContext(NS)) return;
}


export const onchange = (input: HTMLSelectElement) => {
    if (input.id == `${NS}_kindid`) {
        kindid = Misc.fromSelectNumber(`${NS}_kindid`, kindid) ?? 1;
        templateid = "";   // kind changed → story list changes → clear selection
    } else {
        templateid = Misc.fromSelectText(`${NS}_templateid`, "") ?? "";
    }
    App.render();
}


export const submit = () => {
    if (templateid == "") return;
    App.transitionUI();
    state.fromTemplateAsync(templateid)
        .then((payload: any) => {
            const menu = kindid == Lookup.LUID_KIND_ADV ? `menu2` : `menu`;
            Misc.toastSuccess("Histoire ajoutée à ta bibliothèque!");
            Router.goto(`#/${menu}/${payload.gameid}`);
        })
        .catch(App.render);
}
