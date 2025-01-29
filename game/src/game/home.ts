import * as App from "../core/app.js"
import { plus, message } from "../core/theme/theme-icon.js"
import { GameList, state } from "./state.js"

export const NS = "GHOME";



const formTemplate = (list: GameList[]) => {

    const games = list.map(item => {
        return `<div class="box item">${message}<a href="#/menu/${item.code}">${item.title}</a></div>`
    })

    games.push(`<div class="box plus">${plus}<a href="#/editor/new">Ajouter un livre</a></div>`)

    return games.join("")
}

const pageTemplate = (form: string) =>{
    return `
<div style="--d:flex; --jc:center">
    <h1>Bibliothèque</h1>
</div>
<div class="form">
${form}
</div>
`
}



export const fetch = async (args: string[] | undefined) => {
    App.prepareRender(NS, "Home", "game_home")
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
