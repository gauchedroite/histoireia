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
        return Misc.toStaticText(value)

    return renderInputCheckbox(ns, propName, value, text, option)
}



export const renderInputCheckbox = (ns: string, propName: string, value: boolean, text: string, option: IOpt, filter = false) => {
    return `
<div style="margin:0.5rem 0 1rem;">
<input type="checkbox"
    id="${ns}_${propName}" 
    onchange="${ns}.onchange(this)" 
    ${value ? "checked" : ""}
    ${option.disabled ? "disabled" : ""}
>
<label for="${ns}_${propName}">${text}</label>
</div>
`;
}
