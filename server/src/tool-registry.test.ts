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
        assert.ok(tools.length >= 2);

        const names = tools.map((t: any) => t.function.name);
        assert.ok(names.includes("roll_pbta"));
        assert.ok(names.includes("resolve_pbta"));
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

    describe("roll_pbta", () => {
        it("returns a JSON string with a roll property", async () => {
            const result = await callTool("roll_pbta", { modifier: 1 });
            const parsed = JSON.parse(result);
            assert.ok(typeof parsed.roll === "number");
        });

        it("roll is within expected range (2d6 + modifier)", async () => {
            // With modifier 0, range is 2..12
            // Run multiple times to reduce flakiness
            for (let i = 0; i < 20; i++) {
                const result = JSON.parse(await callTool("roll_pbta", { modifier: 0 }));
                assert.ok(result.roll >= 2 && result.roll <= 12,
                    `roll ${result.roll} out of range 2..12`);
            }
        });

        it("modifier shifts the result", async () => {
            // With modifier +100, minimum is 102
            const result = JSON.parse(await callTool("roll_pbta", { modifier: 100 }));
            assert.ok(result.roll >= 102);
        });
    });

    describe("resolve_pbta", () => {
        it("returns success for roll >= 10", async () => {
            const result = JSON.parse(await callTool("resolve_pbta", { roll: 10 }));
            assert.strictEqual(result, "Succès complet");
        });

        it("returns mixed success for roll 7-9", async () => {
            const result = JSON.parse(await callTool("resolve_pbta", { roll: 7 }));
            assert.strictEqual(result, "Succès mitigé");
        });

        it("returns failure for roll < 7", async () => {
            const result = JSON.parse(await callTool("resolve_pbta", { roll: 6 }));
            assert.strictEqual(result, "Échec avec conséquence");
        });
    });

    describe("unknown tool", () => {
        it("returns 'Unknown tool' for unregistered name", async () => {
            const result = await callTool("nonexistent_tool", {});
            assert.strictEqual(result, "Unknown tool");
        });
    });
});
