
export async function waitAsync(msec: number) {
    return new Promise(resolve => setTimeout(resolve, msec));
}

export async function waitTwoSecondAsync() {
    return new Promise(resolve => setTimeout(resolve, 2000));
}

export function emitEvent(name: string, detail?: any) {
    const event = new CustomEvent(name, { detail });
    document.dispatchEvent(event);
}

export function pluralize(name: string, count: number) {
    return name + (count > 1 ? "s" : "")
}

export function capitalize(username: string) {
    return username.charAt(0).toUpperCase() + username.slice(1)
}
