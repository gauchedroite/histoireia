
import * as router from "../core/router.js"
import * as home from "./home.js"
import * as menu from "./menu.js"
import * as story from "./story.js"
import * as editor from "./editor.js"


(window as any)[home.NS] = home;
(window as any)[menu.NS] = menu;
(window as any)[story.NS] = story;
(window as any)[editor.NS] = editor;



export const assignDefaultRoute = (routeName: string) => {
    // This must be set after all the other routes are defined
    // otherwise it will always be the first one to fire!
    router.addRoute(routeName, params => home.fetch(params));
}


export const startup = () => {
    router.addRoute("^#/menu/?(.*)$", params => menu.fetch(params));
    router.addRoute("^#/story/?(.*)$", params => story.fetch(params));
    router.addRoute("^#/editor/?(.*)$", params => editor.fetch(params));
}

export const render = () => {
    return `
    ${home.render()}
    ${menu.render()}
    ${story.render()}
    ${editor.render()}
`
}

export const postRender = () => {
    home.postRender();
    menu.postRender();
    story.postRender();
    editor.postRender();
}
