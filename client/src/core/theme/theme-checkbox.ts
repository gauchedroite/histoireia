import { IOpt } from "./theme.js";
import * as Misc from "../misc.js"



export interface ICheckbox {
    id: number
    description: string
    selected: boolean
    xref: number
}

export interface IOptCheckbox extends IOpt {
    cols: number
}



export const renderFieldCheckbox = (ns: string, propName: string, value: boolean, label: string, text: string, option: IOpt) => {

    if (option.readonly ?? false)
        return wrap_field(label, Misc.toStaticText(value))

    return wrap_field(label, renderInputCheckbox(ns, propName, value, text, option))
}




const wrap_field = (label: string, html: string) => {
    if (label != undefined && label.length > 0)
        return `
        ${label}
        ${html}
        `
    else
        return html
}


export const renderInputCheckbox = (ns: string, propName: string, value: boolean, text: string, option: IOpt, filter = false) => {
    return `
<input type="checkbox"
    id="${ns}_${propName}" 
    onchange="${ns}.onchange(this)" 
    ${value ? "checked" : ""}
    ${option.disabled ? "disabled" : ""}
>
<label for="${ns}_${propName}">${text}</label>
`;
}
