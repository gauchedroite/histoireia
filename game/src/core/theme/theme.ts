

//text
export { IOptText, renderFieldText, renderFieldTextarea, input_Textarea } from "./theme-text.js"


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


export const wrapAddon = (addon: string, disabled = false) => {
    return `<div style="padding: 0.5rem 0.5rem 0.5rem 1rem; ${disabled ? "opacity: 0.5" : ""}">${addon}</div>`
}
