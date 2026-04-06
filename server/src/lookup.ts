import fs from "fs-extra";
import path from "path";
import { lookupPath } from "./path-names";
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
fs.watch(lookupPath, (_event, filename) => {
    if (filename === "llm.json" || filename === "kind.json") {
        try {
            loadSync();
        } catch (err) {
            console.error("Failed to reload lookup config:", err);
        }
    }
});

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
