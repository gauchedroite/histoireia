import { IOpt, wrapAddon } from "./theme.js"
import * as Lookup from "../lookup.js"
import * as Misc from "../misc.js"


export interface IOptDropdown extends IOpt {
    hoverable: boolean
    missingid?: number
    missingtext?: string
}



export const renderFieldDropdown = (ns: string, propName: string, options: string, text: string, label: string, option: IOptDropdown) => {
    if (option.size == undefined)
        option.size = "js-width-50";

    let hasAddon = (option.addon != undefined);
    let hasUrl = (option.url && !option.url.endsWith("/null"))

    if (options.startsWith("<!--")) {
        option.missingid = +options.substring("<!--".length, options.indexOf("-->"));
        option.missingtext = text;
    }

    if (option.readonly ?? false) {
        let html = hasUrl ? `<a href="${option.url}">${Misc.toStaticText(text)}&nbsp;&nbsp;<i class="far fa-external-link-square-alt"></i></a>` : Misc.toStaticText(text);

        return wrap_field_readonly(label, option, `
<div style="width: 100%; padding-top: 6px;">
    ${html}
    ${option.addon ? `<span style="padding-left:1rem;">${option.addon}</span>` : ""}
    ${option.help ? `<p class="help">${option.help}</p>` : ``}
</div>
`)
    }


    let anchor = hasUrl ? `<a href="${option.url}">&nbsp;<i class="far fa-external-link-square-alt"></i></a>` : "";

    return wrap_field(ns, propName, label, option, `
<div class="field">
    <div class="field is-grouped ${hasAddon || anchor ? "has-addons" : ""}">
        ${input_Dropdown(ns, propName, options, option)}
        ${anchor ? `<div class="control"><div style="padding: 0.5rem;">${anchor}</div></div>` : ``}
        ${option.addon ? wrapAddon(option.addon, option.disabled) : ``}
    </div>
    ${option.help ? `<p class="help">${option.help}</p>` : ``}
</div>
`)
}


const wrap_field = (ns: string, propName: string, label: string, option: IOptDropdown, html: string) => {
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



const input_Dropdown = (ns: string, propName: string, options: string, option: IOptDropdown) => {
    return `
<div class="select jso ${option.size ?? ""} ${option.missingid ? "js-archived" : ""}">
<select id="${ns}_${propName}"
    onchange="${ns}.onchange(this)" 
    ${option.required ? "required" : ""}
    ${option.disabled ? "disabled tabindex='-1'" : ""}>
    ${option.missingid ? `<option value="${option.missingid}" selected disabled>${option.missingtext}</option>` : ""}
    ${options}
</select>
<div class="jso-td">&nbsp;</div>
</div>
`;
}



export const renderOptions = (list: Lookup.LookupData[], selectedId: number | string | null, hasEmptyOption: boolean, emptyText = "") => {
    return renderOptionsFun(list, selectedId, hasEmptyOption, emptyText, (item) => item.description);
}

const renderOptionsFun = (list: Lookup.LookupData[], selectedId: number | string | null, hasEmptyOption: boolean, emptyText = "", fun: (item: Lookup.LookupData) => string) => {
    let options: string;
    let isinlist = false;

    if (hasEmptyOption) {
        let emptySelected = (selectedId == undefined) || (list.findIndex(one => one.id == selectedId) == -1);
        options = list.reduce((html, entry) => {
            let selected = (selectedId != undefined && selectedId == entry.id);
            isinlist = isinlist || selected;
            return html + `<option value="${entry.id}" ${selected ? "selected" : ""} ${entry.disabled ? "disabled" : ""}>${fun(entry)}</option>`;
        }, `<option value="" ${emptySelected ? "selected" : ""}>${emptyText ?? ""}</option>`);
    }
    else {
        options = list.reduce((html, entry, index) => {
            let selected = (selectedId != undefined && selectedId == entry.id);
            isinlist = isinlist || selected;
            selected = selected || (selectedId == undefined && index == 0);
            return html + `<option value="${entry.id}" ${selected ? "selected" : ""} ${entry.disabled ? "disabled" : ""}>${fun(entry)}</option>`;
        }, "");
    }

    if (selectedId != undefined && emptyText != undefined) {
        if (!isinlist) {
            //options = `<option value="${selectedId}" selected disabled>${emptyText} **ARCHIVED**</strong></option>` + options;
            options = `<!-- ${selectedId} -->` + options;
        }
    }

    return options;
}
