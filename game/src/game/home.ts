import * as App from "../core/app.js"
import * as router from "../core/router.js"

export const NS = "GHOME";


interface State {
    code: string
    title: string
}
let state: State[] = [];



const formTemplate = () => {
    const games = state.reduce((html, item) => {
        return html + `<li><a href="#/menu/${item.code}">${item.title}</a></li>`
    }, "")

    return games
}

const pageTemplate = (form: string) =>{
    return `
H O M E
<ul>
    ${form}
    <li><a href="#/editor/new">Ajouter une histoire</a></li>
</ul>
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
