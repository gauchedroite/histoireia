import * as App from "../core/app.js";
import * as Misc from "../core/misc.js";
import * as Theme from "../core/theme/theme.js";
import { state } from "./state.js";
export const NS = "GED";
let mystate = {};
let gameid = "";
let isNew = false;
const formTemplate = (item) => {
    const add = (row) => rows.push(row);
    let rows = [];
    add(Theme.renderFieldText(NS, "code", item.code, "Code", { maxlength: 10, required: true }));
    add(Theme.renderFieldText(NS, "title", item.title, "Titre", { maxlength: 32, required: true }));
    add(Theme.renderFieldTextarea(NS, "prompt", item.prompt, "Prompt", { maxlength: 8192, required: true, rows: 30 }));
    if (isNew) {
        add(`<button type="button" onclick="location.href='#/menu/${item.code}'"><i class="fa-solid fa-sparkles"></i>&nbsp;Enregistrer la nouvelle histoire //${item.code}</button>`);
    }
    else {
        add(`<button type="button" onclick="location.href='#/editor/${gameid}'"><i class="fa-light fa-floppy-disk"></i>&nbsp;Enregistrer les changements</button>`);
    }
    return rows.join("");
};
const pageTemplate = (form) => {
    const returnurl = isNew ? "#/home" : `#/menu/${gameid}`;
    return `
<div class="ct-header">
    <h3>
        <a href="${returnurl}"><i class="fa-solid fa-arrow-left"></i></a>
        <span>Editeur</span>
    </h3>
</div>
<div class="ct-content form">
${form}
</div>
`;
};
export const fetch = (args) => {
    gameid = (args ? args[0] : "");
    isNew = (gameid == "new");
    App.prepareRender(NS, "Editor", "game_editor");
    if (!isNew) {
        state.fetch_game_definition(gameid)
            .then(payload => {
            mystate = Misc.clone(payload);
        })
            .then(App.untransitionUI)
            .then(App.render)
            .catch(App.render);
    }
    else {
        state.new_game_definition();
        mystate = Misc.clone(state.game_definition);
        Promise.resolve()
            .then(App.untransitionUI)
            .then(App.render);
    }
};
export const render = () => {
    if (!App.inContext(NS))
        return "";
    const form = formTemplate(mystate);
    return pageTemplate(form);
};
export const postRender = () => {
    if (!App.inContext(NS))
        return;
};
const getFormState = () => {
    let clone = Misc.clone(mystate);
    clone.code = Misc.fromInputText(`${NS}_code`, mystate.code);
    clone.title = Misc.fromInputText(`${NS}_title`, mystate.title);
    clone.prompt = Misc.fromInputText(`${NS}_prompt`, mystate.prompt);
    return clone;
};
export const onchange = (input) => {
    mystate = getFormState();
    App.render();
};
