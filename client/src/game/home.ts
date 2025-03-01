import * as App from "../core/app.js"
import { GameList, state } from "./state.js"

export const NS = "GHOME";


// On touch devices, the `touchstart` event fires earlier than `click`, offering a snappier response:
//
// document.getElementById('my-link').addEventListener('touchstart', function(event) {
//     // Execute your logic here
// });


const formTemplate = (list: GameList[]) => {
    const games = list.map(item => {
        return `<a href="#/menu/${item.code}">
            <div>
                <div>${item.title}</div>
                <i class="fa-thin fa-book"></i>
            </div>
        </a>`
    })
    return games.join("")
}

const pageTemplate = (form: string) => {
    return `
<div class="app-header">
    <div style="text-transform:uppercase; font-weight:bold;">Bibliothèque de ${state.usernameCapitalized}</div>
</div>
<div class="app-content">
    <div class="list">
        <div class="app-list">
            ${form}
        </div>
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
`
}



export const fetch = async (args: string[] | undefined) => {
    App.prepareRender(NS, "Home", "screen_home")
    state.fetch_index()
        .then(App.untransitionUI)
        .then(App.render)
        .catch(App.render);
}

export const render = () => {
    if (!App.inContext(NS)) return "";

    const form = formTemplate(state.index);
    return pageTemplate(form)
}

export const postRender = () => {
    if (!App.inContext(NS)) return
}
