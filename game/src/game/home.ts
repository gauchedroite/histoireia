import * as App from "../core/app.js"
import { GameList, state } from "./state.js"

export const NS = "GHOME";



const formTemplate = (list: GameList[]) => {
    const games = list.map(item => {
        return `<a href="#/menu/${item.code}">
            <div>
                <div>${item.title}</div>
                <i class="fa-regular fa-chevron-right"></i>
            </div>
        </a>`
    })
    return games.join("") + games.join("") + games.join("") 
}

const pageTemplate = (form: string) => {
    return `
<div class="ct-header">
    <div style="text-transform:uppercase; font-weight:bold;">Bibliothèque</div>
</div>
<div class="ct-content form">
    <div class="ct-title">
        <img src="images/home.png" style="width:35%; padding-top:2rem;"/>
        <div style="font-size:xxx-large; font-weight:bold;">HistoireIA</div>
        <div style="font-size:larger; line-height:1;"><span style="border-bottom:1px black dotted;"><em>Toutes les histoires imaginables</em></span></div>
        <div style="font-size:smaller;padding:1.5rem 0 3rem;">Studio GaucheDroite</div>
    </div>
    <div class="ct-list">
        ${form}
    </div>
</div>
<div class="ct-footer">
    <a href="#/editor/new">
        <div><i class="fa-solid fa-plus"></i>&nbsp;Ajouter un livre</div>
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
