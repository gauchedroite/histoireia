import * as App from "../core/app.js"
import { GameList, state } from "./state.js"
import { LUID_KIND_ADV } from "../lookupdata.js"

export const NS = "GHOME";


// On touch devices, the `touchstart` event fires earlier than `click`, offering a snappier response:
//
// document.getElementById('my-link').addEventListener('touchstart', function(event) {
//     // Execute your logic here
// });


let favorites: string[] = []
const fetchFavoritesAsync = () =>
    App.GET(`users/${state.username}/favorites`).then((list: any) => { favorites = Array.isArray(list) ? list : [] })

const formTemplate = (list: GameList[]) => {
    const sorted = list.slice().sort((a, b) => {
        const fa = favorites.includes(a.code) ? 1 : 0
        const fb = favorites.includes(b.code) ? 1 : 0
        return fb - fa
    })
    const games = sorted.map(item => {
        const menu = item.kind_id == LUID_KIND_ADV ? `menu2` : `menu`;
        const icon = favorites.includes(item.code)
            ? `fa-solid fa-heart`
            : `fa-thin ${item.started ? "fa-book" : "fa-book-sparkles"}`
        
        return `<a href="#/${menu}/${item.code}">
            <div>
                <div>${item.title}</div>
                <i class="${icon}"></i>
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
    <a href="#" onclick="window.location.back();return false;">
        <div><i class="fa-regular fa-user-alien"></i></i>&nbsp;Bonjour!</div>
    </a>
</div>
`
}



export const fetch = async (_args: string[] | undefined) => {
    App.prepareRender(NS, "Home", "screen_home")
    Promise.all([state.fetchIndexAsync(), fetchFavoritesAsync()])
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
