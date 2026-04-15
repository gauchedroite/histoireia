import fs from "fs-extra";
import path from "path";
import { rollPbta, resolvePbta } from "./server_tools";
import { lookupPath, toolsPath } from "./path-names";


// --- Types ---

interface ToolEntry {
    type: "local" | "mcp";
    module?: string;      // for local: key into localModules
    server?: string;      // for mcp: server name (future)
    definition: string;   // filename in public/data/tools/
}

type ToolConfig = Record<string, ToolEntry>;


// --- Local tool modules ---

const localModules: Record<string, Record<string, (args: any) => any>> = {
    "pbta": { roll_pbta: rollPbta, resolve_pbta: resolvePbta }
};


// --- Registry state ---

let registry: ToolConfig | null = null;

async function loadRegistry(): Promise<ToolConfig> {
    if (registry) return registry;
    const configPath = path.join(lookupPath, "tools.json");
    const content = await fs.readFile(configPath, "utf8");
    registry = JSON.parse(content) as ToolConfig;
    return registry;
}


// --- Public API ---

export async function getToolDefinitions(hasTools: boolean): Promise<any[]> {
    if (!hasTools) return [];
    const reg = await loadRegistry();
    const definitions: any[] = [];
    for (const entry of Object.values(reg)) {
        const defPath = path.join(toolsPath, entry.definition);
        const content = await fs.readFile(defPath, "utf8");
        definitions.push(JSON.parse(content));
    }
    return definitions;
}

export async function callTool(name: string, args: object): Promise<string> {
    const reg = await loadRegistry();
    const entry = reg[name];
    if (!entry) return "Unknown tool";

    if (entry.type === "local") {
        const mod = localModules[entry.module!];
        const fn = mod?.[name];
        if (!fn) return "Unknown tool";
        const result = fn(args);
        return JSON.stringify(result);
    }

    if (entry.type === "mcp") {
        // Future: lazy-init MCP client for entry.server, call tool
        return `MCP tool "${name}" not yet connected`;
    }

    return "Unknown tool type";
}
