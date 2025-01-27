import * as App from "../core/app.js"
import * as router from "../core/router.js"
import { plus, message } from "../core/theme/theme-icon.js"
import { GameList as State } from "./game-objects.js"

export const NS = "GHOME";


let state: State[] = [];



const formTemplate = () => {

    const games = state.map(item => {
        return `<div class="box item">${message}<a href="#/menu/${item.code}">${item.title}</a></div>`
    })

    games.push(`<div class="box plus">${plus}<a href="#/editor/new">Ajouter une histoire</a></div>`)

    return games.join("")
}

const pageTemplate = (form: string) =>{
    return `
<div style="--d:flex; --jc:center">
    <h1>Historiettes</h1>
</div>
<div class="form">
${form}
</div>
`
}



export const fetch = async (args: string[] | undefined) => {
    App.prepareRender(NS, "Home", "game_home")
    App.GET("assets/_index.json")
        .then((payload: any) =>{
            state = payload;
        })
        .then(App.render)
        .catch(App.render);
}

export const render = () => {
    if (!App.inContext(NS)) return "";

    const form = formTemplate();
    return pageTemplate(form)
}

export const postRender = () => {
    if (!App.inContext(NS)) return
}
