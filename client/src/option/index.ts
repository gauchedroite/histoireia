// Background shader picker — standalone desktop admin. Mirrors llm/index.ts.
//
// Endpoints (no Express auth — gated by Caddy on /histoireia/editor*):
//   GET /editor/shaders   -> { current: string, shaders: string[] }
//   PUT /editor/shaders   -> { name: string }   (body { name })

const root = document.getElementById("app_root") as HTMLElement;

const api = {
    get: <T>(u: string): Promise<T> => fetch(u).then(async r => { if (!r.ok) throw new Error(`${r.status}`); return (await r.json()) as T; }),
    put: <T>(u: string, body: unknown): Promise<T> => fetch(u, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
    }).then(async r => { if (!r.ok) throw new Error(`${r.status}`); return (await r.json()) as T; }),
};

let shaders: string[] = [];
let current = "";
let selected = "";
let saving = false;
let error = "";
let saved = false;

const render = () => {
    const opts = shaders.map(s =>
        `<option value="${s}"${s === selected ? " selected" : ""}>${s}</option>`).join("");
    root.innerHTML = `<div class="ed-wrap">
        <header class="ed-header">
            <h1>Shader d'arrière-plan</h1>
            <span class="ed-spacer"></span>
            <a href="admin.html">Admin</a>
            <a href="index.html">← Retour</a>
        </header>
        ${error ? `<div class="ed-error">${error}</div>` : ""}
        <div class="ed-form">
            <label>Shader actif
                <select id="opt-shader">${opts}</select>
            </label>
            <div class="ed-hint">
                Shader courant côté serveur : <code>${current}</code>
                ${saved ? " · <strong>enregistré</strong>" : ""}
            </div>
            <div class="ed-actions">
                <button type="button" id="opt-save" ${saving ? "disabled" : ""}>${saving ? "Enregistrement…" : "Enregistrer"}</button>
            </div>
        </div>
    </div>`;
    error = "";
    saved = false;
};

const fetchList = async () => {
    try {
        const data = await api.get<{ current: string; shaders: string[] }>("editor/shaders");
        shaders = data.shaders;
        current = data.current;
        selected = data.current;
        render();
    } catch {
        error = "Impossible de charger les shaders.";
        render();
    }
};

root.addEventListener("change", (e) => {
    const t = e.target as HTMLElement;
    if (t.id === "opt-shader") selected = (t as HTMLSelectElement).value;
});

root.addEventListener("click", async (e) => {
    const t = e.target as HTMLElement;
    if (t.id !== "opt-save") return;
    saving = true;
    render();
    try {
        await api.put<{ name: string }>("editor/shaders", { name: selected });
        current = selected;
        saved = true;
        saving = false;
        render();
    } catch {
        error = "Impossible d'enregistrer le shader.";
        saving = false;
        render();
    }
});

fetchList();
