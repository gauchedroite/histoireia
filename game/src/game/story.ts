import * as App from "../core/app.js"
import * as router from "../core/router.js"

export const NS = "GSTORY";


interface State {
    code: string
    title: string
    bg_url: string
    prompt: string
}
let state: State = <State>{};
let gameid: string = ""



const formTemplate = () => {
    return ``
}

const pageTemplate = (form: string) =>{
    return `
S T O R Y - ${state.title}
<ul>
    <li><a href="#/menu/${gameid}">Retourner au menu</a></li>
</ul>
`
}



export const fetch = (args: string[] | undefined) => {
    gameid = (args ? args[0] : "");
    App.prepareRender(NS, "Story", "game_story")
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
