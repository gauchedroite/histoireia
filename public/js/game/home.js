import * as App from "../core/app.js";
import { state } from "./state.js";
export const NS = "GHOME";
// On touch devices, the `touchstart` event fires earlier than `click`, offering a snappier response:
//
// document.getElementById('my-link').addEventListener('touchstart', function(event) {
//     // Execute your logic here
// });
const formTemplate = (list) => {
    const games = list.map(item => {
        return `<a href="#/menu/${item.code}">
            <div>
                <div>${item.title}</div>
                <i class="fa-thin fa-book"></i>
            </div>
        </a>`;
    });
    return games.join(""); //+ games.join("") + games.join("") + games.join("") 
};
const pageTemplate = (form) => {
    return `
<div class="app-header">
    <div style="text-transform:uppercase; font-weight:bold;">Bibliothèque de ${state.usernameCapitalized}</div>
</div>
<div class="app-content">
    <div class="title">
        <img src="images/home.png" style="width:35%; padding-top:2rem;"/>
        <div style="font-size:xxx-large; font-weight:bold;">HistoireIA</div>
        <div style="font-size:larger; line-height:1;"><span style="border-bottom:1px black dotted;"><em>Toutes les histoires imaginables</em></span></div>
        <div style="font-size:smaller;padding:1.5rem 0 3rem;">Studio GaucheDroite</div>
    </div>
    <div class="app-list">
        ${form}
    </div>
</div>
<div class="app-footer">
    <a href="#/editor/new">
        <div><i class="fa-solid fa-plus"></i>&nbsp;Ajouter un livre</div>
    </a>
    <a href="#" onclick="window.location.back();return false;">
        <div><i class="fa-regular fa-user-alien"></i></i>&nbsp;Bonjour!</div>
    </a>
</div>
`;
};
export const fetch = async (args) => {
    App.prepareRender(NS, "Home", "screen_home");
    state.fetch_index()
        .then(App.untransitionUI)
        .then(App.render)
        .catch(App.render);
};
export const render = () => {
    if (!App.inContext(NS))
        return "";
    const form = formTemplate(state.index);
    return pageTemplate(form);
};
export const postRender = () => {
    if (!App.inContext(NS))
        return;
};
//# sourceMappingURL=home.js.map