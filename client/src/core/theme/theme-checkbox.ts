import { IOpt } from "./theme.js";
import * as Lookup from "../lookup.js"



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
        return wrap_field_readonly(label, option, `
            <div style="width: 100%; padding-top: 6px;">
                ${renderRawCheckbox(ns, propName, value, text, option)}
                ${option.help != undefined ? `<p class="help">${option.help}</p>` : ``}
            </div>
            `)

    return wrap_field(label, option, `
        <div class="field">
            <div class="control ${option.size ? option.size : ""}">
                <label class="checkbox ${option.disabled ? "js-disabled" : ""}">
                    ${input_Checkbox(ns, propName, value, text, option)}
                </label>
            </div>
            ${option.addon ? option.addon : ``}
            ${option.help != undefined ? `<p class="help">${option.help}</p>` : ``}
        </div>
        `)
}

export const renderRawCheckbox = (ns: string, propName: string, value: boolean, text: string, option: IOpt) => {
    if (option.readonly ?? false)
        //return `<input type="checkbox" onclick="return false;" tabindex="-1" disabled ${value ? "checked" : ""}> ${text}`
        return value ? `<i class="fa-light fa-square-check"></i> ${text}` : `<i class="fa-light fa-square"></i> ${text}`

    return `<label class="checkbox ${option.disabled ? "js-disabled" : ""}">
                ${input_Checkbox(ns, propName, value, text, option)}
            </label>`
}




const wrap_field = (label: string, option: IOpt, html: string) => {
    return `
<div class="field is-horizontal">
    <div class="field-label is-normal"><label class="label ${option.required ? "js-required" : ""}">${label}</label></div>
    <div class="field-body" style="margin-top: 0.375em;">
        ${html}
    </div>
</div>
`
}

const wrap_field_readonly = (label: string, option: IOpt, html: string) => {
    return `
<div class="field is-horizontal js-field-static">
    <div class="field-label is-normal"><label class="label ${option.required ? "js-required" : ""}">${label}</label></div>
    <div class="field-body">
        ${html}
    </div>
</div>
`
}




export const input_Checkbox = (ns: string, propName: string, value: boolean, text: string, option: IOpt, filter = false) => {
    return `
<input type="checkbox"
    id="${ns}_${propName}" 
    onchange="${ns}.onchange(this)" 
    ${value ? "checked" : ""} ${option.disabled ? "disabled" : ""}
> ${text}
`;
}
