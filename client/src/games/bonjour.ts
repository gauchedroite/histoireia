import * as App from "../core/app.js"
import * as Misc from "../core/misc.js"
import { IOptText, renderFieldText } from "../core/theme/theme-text.js";
import { state } from "./state.js"

export const NS = "GBONJOUR";

let editing = false;


const template = () => {
    const root = document.documentElement;
    const styles = getComputedStyle(root);
    const sait = styles.getPropertyValue('--sait').trim();
    const saib = styles.getPropertyValue('--saib').trim();
    const sail = styles.getPropertyValue('--sail').trim();
    const sair = styles.getPropertyValue('--sair').trim();

    if (!editing) {
        return `
        <div class="app-content">
            <div class="content">
                <div class="bonjour" onclick="${NS}.editName(true)">Bonjour ${state.usernameCapitalized}!</div>
                <a class="visual" href="#/home"></a>
                <a class="choose" href="#/home">Choisis une histoire dans la bibliothèque!</a>
            </div>
        </div>
        `
    }
    else {
        const input = renderFieldText(NS, "username", state.username, "", <IOptText>{ required: true, minlength: 5 })
        const submit = `<button type="submit" onclick="${NS}.submit()"><i class="fa-light fa-check"></i></button>`
        return `
        <div class="app-content">
            <div class="content">
                <div class="bonjour">
                    <span>Bonjour!</span>
                    ${input}
                    ${submit}
                </div>
                <a class="visual" href="#" onclick="return none;"></a>
                <a class="choose" href="#" onclick="return none;"></a>
            </div>
        </div>
        `
    }
}

const formTemplate = (form: string) => {
    return `
<form onsubmit="return false;">
<input type="submit" style="display:none;" id="${NS}_dummy_submit">
    ${form}
</form>
`
}


export const fetch = (args: string[] | undefined) => {
    let username = (args != undefined ? args[0] : "");
    if (username != undefined && username.length > 5) {
        state.username = username
    }
    editing = state.username == undefined || state.username.length == 0

    App.prepareRender(NS, "Bonjour", "screen_bonjour")
    App.renderOnNextTick();
}

export const render = () => {
    if (!App.inContext(NS)) return ""
    return formTemplate(template())
}

export const postRender = () => {
    if (!App.inContext(NS)) return
}



export const onchange = (input: HTMLInputElement) => {
    state.username = Misc.fromInputText(`${NS}_username`, state.username)!;
    console.log(state.username)
    App.render();
}


export const editName = (yesno: boolean) => {
    editing = yesno
    App.renderOnNextTick()
}

export const submit = () => {
    if (!Misc.html5Valid(NS)) return;
    editing = false
    App.renderOnNextTick()
}
