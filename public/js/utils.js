export async function waitAsync(msec) {
    return new Promise(resolve => setTimeout(resolve, msec));
}
export function emitEvent(name, detail) {
    const event = new CustomEvent(name, { detail });
    document.dispatchEvent(event);
}
export function pluralize(name, count) {
    return name + (count > 1 ? "s" : "");
}
export function capitalize(username) {
    return username.charAt(0).toUpperCase() + username.slice(1);
}
//# sourceMappingURL=utils.js.map