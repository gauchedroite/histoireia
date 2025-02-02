import * as App from "../core/app.js";
import * as Misc from "../core/misc.js";
import { state } from "./state.js";
export const NS = "GMENU";
let mystate;
let mystate2;
let gameid = "";
const formTemplate = (messages) => {
    const add = (row) => rows.push(row);
    let rows = [];
    const lastPage = state.lastPageNo();
    if (lastPage == -1) {
        add(`<div class="box item"><a href="#/story/${gameid}/new">Commencer à lire</a></div>`);
    }
    else {
        add(`<div class="box item"><a href="#/story/${gameid}/${lastPage}">Continuer à lire</a></div>`);
        add(`<div class="box item"><a href="#/story/${gameid}/new">Recommencer le livre?</a></div>`);
    }
    add(`<div class="box item"><a href="#/editor/${gameid}">Éditeur</a></div>`);
    return rows.join("");
};
const pageTemplate = (form) => {
    return `
<div class="ct-header">
    <h2>
        <a href="#/home"><i class="fa-solid fa-arrow-left"></i></a>
        <span>${mystate.title}</span>
    </h2>
</div>
<div class="ct-content form">
${form}
</div>
`;
};
export const fetch = (args) => {
    gameid = (args ? args[0] : "");
    App.prepareRender(NS, "Menu", "game_menu");
    state.fetch_game_definition(gameid)
        .then((payload) => {
        mystate = Misc.clone(payload);
        mystate2 = state.getMessages();
    })
        .then(App.untransitionUI)
        .then(App.render)
        .catch(App.render);
};
export const render = () => {
    if (!App.inContext(NS))
        return "";
    const form = formTemplate(mystate2);
    return pageTemplate(form);
};
export const postRender = () => {
    if (!App.inContext(NS))
        return;
};
