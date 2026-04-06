import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import fs from "fs-extra";
import path from "path";
import { app } from "./server";
import { usersPath } from "./path-names";
import type { Server } from "http";

const PORT = 9341;
const BASE = `http://localhost:${PORT}`;
let server: Server;

before(() => {
    return new Promise<void>((resolve) => {
        server = app.listen(PORT, () => resolve());
    });
});

after(() => {
    return new Promise<void>((resolve) => {
        server.close(() => resolve());
    });
});

describe("GET /stories-for/:username", () => {
    it("returns a list of stories", async () => {
        const res = await fetch(`${BASE}/stories-for/christian`);
        assert.strictEqual(res.status, 200);
        const body = await res.json();
        assert.ok(Array.isArray(body));
        assert.ok(body.length > 0);
        assert.ok(body[0].code);
        assert.ok(body[0].title);
    });

    it("rejects invalid username", async () => {
        const res = await fetch(`${BASE}/stories-for/BAD_USER`);
        assert.strictEqual(res.status, 400);
    });
});

describe("GET /stories/:gameid", () => {
    it("returns a game definition", async () => {
        const res = await fetch(`${BASE}/stories/billy`);
        assert.strictEqual(res.status, 200);
        const body = await res.json();
        assert.strictEqual(body.code, "billy");
        assert.strictEqual(body.title, "Aventures à Tukuman");
        assert.ok(body.prompt);
    });

    it("rejects invalid gameid", async () => {
        const res = await fetch(`${BASE}/stories/BAD-ID`);
        assert.strictEqual(res.status, 400);
    });
});

describe("GET /users/:username/:gameid", () => {
    it("returns empty object for nonexistent state", async () => {
        const res = await fetch(`${BASE}/users/nobodyhere/billy`);
        assert.strictEqual(res.status, 200);
        const body = await res.json();
        assert.deepStrictEqual(body, "{}");
    });

    it("rejects invalid username", async () => {
        const res = await fetch(`${BASE}/users/BAD_USER/billy`);
        assert.strictEqual(res.status, 400);
    });
});

describe("PUT /users/:username/:gameid", () => {
    const testUserDir = path.join(usersPath, "testputuser");

    after(async () => {
        await fs.remove(testUserDir);
    });

    it("saves and retrieves user state", async () => {
        const state = { page: 3, messages: ["hello"] };

        const putRes = await fetch(`${BASE}/users/testputuser/billy`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(state),
        });
        assert.strictEqual(putRes.status, 204);

        const getRes = await fetch(`${BASE}/users/testputuser/billy`);
        assert.strictEqual(getRes.status, 200);
        const body = await getRes.json();
        assert.deepStrictEqual(body, state);
    });
});

describe("sanitizeParam", () => {
    it("blocks path traversal in stories", async () => {
        const res = await fetch(`${BASE}/stories/..%2F..%2Fetc`);
        assert.strictEqual(res.status, 400);
    });

    it("blocks path traversal in users", async () => {
        const res = await fetch(`${BASE}/users/..%2Fetc/passwd`);
        assert.strictEqual(res.status, 400);
    });
});
