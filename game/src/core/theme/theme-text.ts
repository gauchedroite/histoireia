import * as Misc from "../misc.js"
import { IOpt, wrapAddon } from "./theme.js";

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
        return wrap_field_readonly(label, option, `
<div style="width: 100%; padding-top: 6px;">
    ${Misc.toStaticText(value)}
    ${option.addon ?? ""}
    ${option.help != undefined ? `<p class="help">${option.help}</p>` : ``}
</div>
`)

    return wrap_field(ns, propName, label, option, `
<div class="field">
    <div class="field is-grouped ${option.addon ? "has-addons" : ""}">
        ${input_Text(ns, propName, value, option)}
        ${option.addon ? wrapAddon(option.addon, option.disabled) : ``}
    </div>
    ${option.help ? `<p class="help">${option.help}</p>` : ``}
</div>
`)
}

export const renderFieldTextarea = (ns: string, propName: string, value: string | null, label: string, option: IOptText) => {

    if (option.readonly ?? false)
        return wrap_field_readonly(label, option, `
<div style="width: 100%; padding-top: 0.5rem;">
    <div style="margin: 0; padding: 0; font-size: 1em; font-family: Open sans; background-color: unset;">${Misc.toStaticText(value)}</div>
    ${option.help != undefined ? `<p class="help">${option.help}</p>` : ``}
</div>
`)

    return wrap_field(ns, propName, label, option, `
<div class="field">
    ${input_Textarea(ns, propName, value, option)}
    ${option.help ? `<p class="help">${option.help}</p>` : ``}
</div>
`)
}




const wrap_field = (ns: string, propName: string, label: string, option: IOpt, html: string) => {
    return `
<div class="field is-horizontal">
    <div class="field-label is-normal"><label class="label ${option.required ? "js-required" : ""}" for="${ns}_${propName}">${label}</label></div>
    <div class="field-body">
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




const input_Text = (ns: string, propName: string, value: string | null, option: IOptText, filter = false) => {
    return `
<input type="${option.password ? "password" : "text"}"
    class="input ${option.size || ""} ${option.class || ""}" ${option.style ? `style="${option.style}"` : ""}
    id="${ns}_${propName}"
    value="${Misc.toInputText(value)}" 
    ${filter ? `onchange="${ns}.filter_${propName}(this)"` : `onchange="${ns}.onchange(this)"`}
    ${option.required ? "required='required'" : ""} 
    ${option.disabled ? "disabled" : ""}
    ${option.maxlength ? `maxlength="${option.maxlength}"` : ""}
    ${option.datalistname ? `list="${option.datalistname}"` : ""}
    ${option.pattern ? `pattern="${option.pattern}"` : ""}
    ${option.noautocomplete ? option.password ? `autocomplete="new-password"` : "" : ""}
>
`;
}

export const input_Textarea = (ns: string, propName: string, value: string | null, option: IOptText, filter = false) => {
    return `
<textarea
    class="textarea ${option.size || ""}" ${option.size ? `style="min-width: initial"` : ""}
    id="${ns}_${propName}"
    rows="${option.rows}"
    spellcheck="false"
    onchange="${ns}.onchange(this)" 
    ${option.required ? "required='required'" : ""} 
    ${option.disabled ? "disabled" : ""}
    ${option.maxlength > 0 ? `maxlength="${option.maxlength}"` : ``}>${Misc.toInputText(value)}</textarea>
`;
}
