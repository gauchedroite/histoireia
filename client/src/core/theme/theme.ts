

//text
export { IOptText, renderFieldText, renderFieldTextarea, renderInputText, renderInputTextarea } from "./theme-text.js"

//dropdown, autocomplete
export { IOptDropdown, renderFieldDropdown, renderOptions } from "./theme-dropdown.js"



export interface IOpt {
    readonly?: boolean
    required?: boolean
    disabled?: boolean
    px?: number
    size?: string
    help?: string
    addon?: string
    noautocomplete?: boolean
    autoselect?: boolean
    class?: string
    style?: string
    url?: string
    tooltip?: string
    grayout?: boolean
}



export const wrapAddon = (addon: string, disabled = false, raw = false) => {
    if (raw)
        return `<div>${addon}</div>`

    return `<div style="padding: 0.5rem 0.5rem 0.5rem 1rem; ${disabled ? "opacity: 0.5" : ""}">${addon}</div>`
}
