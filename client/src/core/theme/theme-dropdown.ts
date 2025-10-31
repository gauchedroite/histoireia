import { IOpt, wrapAddon } from "./theme.js"
import * as Lookup from "../lookup.js"
import * as Misc from "../misc.js"


export interface IOptDropdown extends IOpt {
    hoverable: boolean
    missingid?: number
    missingtext?: string
}



export const renderFieldDropdown = (ns: string, propName: string, options: string, text: string, label: string, option: IOptDropdown) => {
    if (option.readonly ?? false)
        return wrap_field(label, Misc.toStaticText(text))

    return wrap_field(label, renderInputDropdown(ns, propName, options, option))
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



const renderInputDropdown = (ns: string, propName: string, options: string, option: IOptDropdown) => {
    return `
<select id="${ns}_${propName}"
    onchange="${ns}.onchange(this)" 
    ${option.required ? "required" : ""}
    ${option.disabled ? "disabled tabindex='-1'" : ""}>
    ${option.missingid ? `<option value="${option.missingid}" selected disabled>${option.missingtext}</option>` : ""}
    ${options}
</select>
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
