import * as Misc from "../misc.js"
import { IOpt } from "./theme.js";

export const NS = "App_ThemeText";

declare const marked: any;


export interface IOptText extends IOpt {
    maxlength: number
    listid: string
    placeholder: string
    datalistname?: string
    rows?: number
    pattern?: string
    password: boolean
    noautocomplete: boolean
}




export const renderFieldText = (ns: string, propName: string, value: string | null, label: string, option: IOptText) => {

    if (option.readonly ?? false)
        return wrap_field(label, Misc.toStaticText(value))

    return wrap_field(label, renderInputText(ns, propName, value, option))
}

export const renderFieldTextarea = (ns: string, propName: string, value: string | null, label: string, option: IOptText) => {

    if (option.readonly ?? false)
        return wrap_field(label, Misc.toStaticText(value))

    return wrap_field(label, renderInputTextarea(ns, propName, value, option))
}




const wrap_field = (label: string, html: string) => {
    if (label != undefined && label.length > 0)
        return `
        <label>${label}
            ${html}
        </label>`
    else
        return html
}




export const renderInputText = (ns: string, propName: string, value: string | null, option: IOptText, filter = false) => {
    return `
<input type="${option.password ? "password" : "text"}"
    class="${option.size || ""} ${option.class || ""}" ${option.style ? `style="${option.style}"` : ""}
    id="${ns}_${propName}"
    value="${Misc.toInputText(value)}" 
    ${filter ? `onchange="${ns}.filter_${propName}(this)"` : `onchange="${ns}.onchange(this)"`}
    ${option.required ? "required='required'" : ""} 
    ${option.disabled ? "disabled" : ""}
    ${option.maxlength ? `maxlength="${option.maxlength}"` : ""}
    ${option.datalistname ? `list="${option.datalistname}"` : ""}
    ${option.pattern ? `pattern="${option.pattern}"` : ""}
    ${option.noautocomplete ? option.password ? `autocomplete="new-password"` : "" : ""}
    ${option.placeholder ? `placeholder="${option.placeholder}"` : ""}
>
`;
}

export const renderInputTextarea = (ns: string, propName: string, value: string | null, option: IOptText, filter = false) => {
    return `
<textarea
    class="${option.size || ""}" ${option.size ? `style="min-width: initial"` : ""}
    id="${ns}_${propName}"
    rows="${option.rows}"
    spellcheck="false"
    onchange="${ns}.onchange(this)" 
    ${option.required ? "required='required'" : ""} 
    ${option.disabled ? "disabled" : ""}
    ${option.maxlength > 0 ? `maxlength="${option.maxlength}"` : ``}>${Misc.toInputText(value)}</textarea>
    ${option.placeholder ? `placeholder="${option.placeholder}"` : ""}
`;
}
