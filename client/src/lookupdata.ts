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
