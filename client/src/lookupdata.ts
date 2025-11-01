import * as App from "./core/app.js"
import { LookupData, ILookup } from "./core/lookup.js";
export { LookupData, ILookup }



let llm: LookupData[];
export const invalidate_llm = () => (llm as any) = null;
export const fetch_llm = async () => {
    if (llm != undefined && llm.length > 0)
        return;
    llm = await App.GET(`data/lookup/llm.json`) as any;
}
export const get_llm = () => llm;


let kind: LookupData[];
export const invalidate_kind = () => (kind as any) = null;
export const fetch_kind = async () => {
    if (kind != undefined && kind.length > 0)
        return;
    kind = await App.GET(`data/lookup/kind.json`) as any;
}
export const get_kind = () => kind;



// Populate some default LUIDs
export let LUID_KIND_ADV: number | null;
//
export const populateLUID = async () => {
    await fetch_kind()
    LUID_KIND_ADV = kind.find(one => one.code == "adv")?.id as number;
}
