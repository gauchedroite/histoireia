import { describe, it } from "node:test";
import assert from "node:assert";
import { getToolDefinitions, callTool } from "./tool-registry";


describe("getToolDefinitions", () => {
    it("returns empty array when hasTools is false", async () => {
        const tools = await getToolDefinitions(false);
        assert.deepStrictEqual(tools, []);
    });

    it("returns tool definitions when hasTools is true", async () => {
        const tools = await getToolDefinitions(true);
        assert.ok(Array.isArray(tools));
        assert.ok(tools.length >= 1);

        const names = tools.map((t: any) => t.function.name);
        assert.ok(names.includes("roll_d6"));
    });

    it("returns definitions in OpenAI function-calling format", async () => {
        const tools = await getToolDefinitions(true);
        for (const tool of tools) {
            assert.strictEqual(tool.type, "function");
            assert.ok(tool.function.name);
            assert.ok(tool.function.description);
            assert.ok(tool.function.parameters);
        }
    });
});


describe("callTool", () => {

    describe("roll_d6", () => {
        it("returns a JSON string with a roll property", async () => {
            const result = await callTool("roll_d6", {});
            const parsed = JSON.parse(result);
            assert.ok(typeof parsed.roll === "number");
        });

        it("roll is within expected range 1..6", async () => {
            for (let i = 0; i < 20; i++) {
                const result = JSON.parse(await callTool("roll_d6", {}));
                assert.ok(result.roll >= 1 && result.roll <= 6,
                    `roll ${result.roll} out of range 1..6`);
            }
        });
    });

    describe("unknown tool", () => {
        it("returns 'Unknown tool' for unregistered name", async () => {
            const result = await callTool("nonexistent_tool", {});
            assert.strictEqual(result, "Unknown tool");
        });
    });
});
