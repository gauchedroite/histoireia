let router = [];
let reverting = false;
let resumeTo;
let dirtyExit;
let onHashChange;
let beforeCallback;
let previousRoute;
export const reload = (delay = null) => {
    dirtyExit = null;
    if (delay == null)
        location.reload();
    else
        setTimeout(() => { location.reload(); }, delay);
};
export const registerDirtyExit = (dirtyExitFunction) => {
    dirtyExit = dirtyExitFunction;
};
export const registerHashChanged = (hashChangeFunction) => {
    onHashChange = hashChangeFunction;
};
export const addRoute = (url, callback) => {
    router.push({ url, callback });
};
export const goto = (url, delay = 0) => {
    dirtyExit = null;
    if (delay == 0) {
        if (url == "" || url == "/")
            url = "#/";
        if (window.location.hash != url)
            document.location = url;
        else
            hashChange();
    }
    else {
        setTimeout(() => { goto(url, 0); }, delay);
    }
};
export const gotoCurrent = (delay = 0) => {
    if (delay == 0)
        hashChange();
    else
        setTimeout(() => { gotoCurrent(0); }, delay);
};
export const goBackOrResume = (isDirty) => {
    if (isDirty)
        goto(resumeTo);
    else
        history.back();
};
export const doBeforeCallback = (preCallback) => {
    beforeCallback = preCallback;
};
const hashChange = async () => {
    let hash = window.location.hash;
    if (hash.length == 0)
        hash = "#/";
    const route = router.find(one => hash.match(new RegExp(one.url)));
    if (route) {
        if (!reverting) {
            if (dirtyExit != undefined) {
                let warning = dirtyExit();
                if (warning != undefined && warning) {
                    reverting = true;
                    resumeTo = hash;
                    history.back();
                    return;
                }
            }
            if (onHashChange)
                onHashChange(hash);
            if (route.callback) {
                if (beforeCallback)
                    await beforeCallback();
                let parameters = new RegExp(route.url).exec(hash);
                if (parameters.length < 2 || parameters[1] == undefined)
                    route.callback([]);
                else
                    route.callback(parameters[1].split("/"));
                broadcastChange(hash);
            }
        }
        reverting = false;
    }
};
const broadcastChange = (hash) => {
    const bc = new BroadcastChannel("router:route-change");
    bc.postMessage({ previous: previousRoute, current: hash });
    previousRoute = hash;
};
window.addEventListener("hashchange", hashChange);
window.addEventListener("DOMContentLoaded", hashChange);
