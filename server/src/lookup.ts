import fs from "fs-extra";
import path from "path";
import { lookupPath, assetsPath, usersPath } from "./path-names";
import type { LLMConfig, KindLookup } from "./chat-interfaces";

let llmList: LLMConfig[] = [];
let kindList: KindLookup[] = [];

function loadSync() {
    llmList = JSON.parse(fs.readFileSync(path.join(lookupPath, "llm.json"), "utf8"));
    kindList = JSON.parse(fs.readFileSync(path.join(lookupPath, "kind.json"), "utf8"));
    console.log(`Loaded ${llmList.length} LLM configs, ${kindList.length} game kinds`);
}

loadSync();

// Reload on file change
const lookupWatcher = fs.watch(lookupPath, (_event, filename) => {
    if (filename === "llm.json" || filename === "kind.json") {
        try {
            loadSync();
        } catch (err) {
            console.error("Failed to reload lookup config:", err);
        }
    }
});

// Close the config watcher (used by tests to let the process exit)
export function stopLookupWatcher() {
    lookupWatcher.close();
}

export function getLlmList(): LLMConfig[] {
    return llmList;
}

export function getLlm(id: number): LLMConfig | undefined {
    return llmList.find(one => one.id === id);
}

export function getKindList(): KindLookup[] {
    return kindList;
}

export function getKind(id: number): KindLookup | undefined {
    return kindList.find(one => one.id === id);
}

// Resolve a gameid (template or per-user instance) to its template id.
// Templates live in assets/{id}; instances carry their templateid in
// data/users/{username}/{id}_instance.json. Returns null when unresolvable.
export async function resolveTemplateId(gameid: string, username?: string): Promise<string | null> {
    if (fs.existsSync(path.join(assetsPath, gameid, "metadata.json")))
        return gameid;
    if (!username) return null;
    const instPath = path.join(usersPath, username, `${gameid}_instance.json`);
    if (!fs.existsSync(instPath)) return null;
    const inst = JSON.parse(await fs.readFile(instPath, "utf8"));
    return (inst.templateid as string) ?? null;
}
