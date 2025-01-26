import * as App from "../core/app.js"
import * as router from "../core/router.js"

export const NS = "GMENU";


interface State {
    code: string
    title: string
    bg_url: string
    prompt: string
}
let state: State = <State>{};
let gameid = ""



const formTemplate = () => {
    return `
    <li><a href="#/story/${gameid}">Continuer l'histoire</a></li>
    <li><a href="#/story/${gameid}">Recommencer à partir du début</a></li>
`
}

const pageTemplate = (form: string) =>{
    return `
M E N U - ${state.title}
<ul>
    ${form}
    <li><a href="#/editor/${gameid}">Editeur</a></li>
    <li><a href="./">Index</a></li>
</ul>
`
}



export const fetch = (args: string[] | undefined) => {
    gameid = (args ? args[0] : "");
    App.prepareRender(NS, "Menu", "game_menu")
    App.GET(`assets/${gameid}.json`)
        .then((payload: any) =>{
            state = payload;
        })
        .then(App.render)
        .catch(App.render);
}

export const render = () => {
    if (!App.inContext(NS)) return "";

    const form = formTemplate()
    return pageTemplate(form)
}

export const postRender = () => {
    if (!App.inContext(NS)) return
 }
