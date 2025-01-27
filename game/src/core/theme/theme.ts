

//text
export { IOptText, renderFieldText, renderFieldTextarea, input_Textarea } from "./theme-text.js"


export interface IOpt {
    readonly?: boolean
    required?: boolean
    disabled?: boolean
    px?: number
    size?: string
    noautocomplete?: boolean
    autoselect?: boolean
    class?: string
    style?: string
    url?: string
    tooltip?: string
    grayout?: boolean
}
