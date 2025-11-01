
import * as router from "../core/router.js"
import * as home from "./home.js"
import * as menu from "./menu.js"
import * as menu2 from "./menu2.js"
import * as story from "./story.js"
import * as story2 from "./story2.js"
import * as editor from "./editor.js"
import * as bonjour from "./bonjour.js"


(window as any)[home.NS] = home;
(window as any)[menu.NS] = menu;
(window as any)[menu2.NS] = menu2;
(window as any)[story.NS] = story;
(window as any)[story2.NS] = story2;
(window as any)[editor.NS] = editor;
(window as any)[bonjour.NS] = bonjour;



export const assignDefaultRoute = (routeName: string) => {
    // This must be set after all the other routes are defined
    // otherwise it will always be the first one to fire!
    router.addRoute(routeName, params => bonjour.fetch(params));
}


export const startup = () => {
    router.addRoute("^#/home/?(.*)$", params => home.fetch(params));
    router.addRoute("^#/menu2/?(.*)$", params => menu2.fetch(params));
    router.addRoute("^#/menu/?(.*)$", params => menu.fetch(params));
    router.addRoute("^#/story2/?(.*)$", params => story2.fetch(params));
    router.addRoute("^#/story/?(.*)$", params => story.fetch(params));
    router.addRoute("^#/editor/?(.*)$", params => editor.fetch(params));
    router.addRoute("^#/bonjour/?(.*)$", params => bonjour.fetch(params));
}

export const render = () => {
    return `
    ${home.render()}
    ${menu.render()}
    ${menu2.render()}
    ${story.render()}
    ${story2.render()}
    ${editor.render()}
    ${bonjour.render()}
`
}

export const postRender = () => {
    home.postRender();
    menu.postRender();
    menu2.postRender();
    story.postRender();
    story2.postRender();
    editor.postRender();
    bonjour.postRender();
}
