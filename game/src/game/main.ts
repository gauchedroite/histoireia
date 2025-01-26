
import * as router from "../core/router.js"
// import * as menu from "./story/menu.js"
// import * as story from "./story/story.js"


// (window as any)[menu.NS] = menu;
// (window as any)[story.NS] = story;



export const startup = () => {
    // router.addRoute("^#/story/?(.*)$", params => story.fetch(params));
    // router.addRoute("^#/menu/?(.*)$", params => menu.fetch(params));
}

export const render = () => {
    return `
`
// ${menu.render()}
// ${story.render()}
}

export const postRender = () => {
    // menu.postRender();
    // story.postRender();
}

