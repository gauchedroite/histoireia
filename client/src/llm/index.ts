// LLM config editor — standalone desktop admin. Mirrors editor/index.ts.
//
// Endpoints (no Express auth — gated by Caddy on /histoireia/editor*):
//   GET    /editor/llm        -> LLMConfig[]
//   PUT    /editor/llm/:id    -> { id }   (id "new" creates)
//   DELETE /editor/llm/:id    -> 204

type LLM = {
    id: number; description: string; provider: string; model: string;
    hasTools: boolean; hasJsonSchema: boolean;
};

const root = document.getElementById("app_root") as HTMLElement;

const api = {
    get: <T>(u: string): Promise<T> => fetch(u).then(async r => { if (!r.ok) throw new Error(`${r.status}`); return (await r.json()) as T; }),
    put: <T>(u: string, body: unknown): Promise<T> => fetch(u, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
    }).then(async r => { if (!r.ok) throw new Error(`${r.status}`); return (await r.json()) as T; }),
    del: (u: string): Promise<void> => fetch(u, { method: "DELETE" }).then(r => { if (!r.ok) throw new Error(`${r.status}`); }),
};

let list: LLM[] = [];
let editing: LLM | null = null;
let editId = "";          // "" = list view, "new" = creating, number = editing existing
let error = "";

const escapeHtml = (s: string): string =>
    s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const providerOptions = (selected: string) =>
    ["ollama", "openai"].map(p => `<option value="${p}"${p === selected ? " selected" : ""}>${p}</option>`).join("");

// ---------- list ----------
const renderList = () => {
    const rows = list.map(l => `
        <tr>
            <td><a href="#" data-open="${l.id}">${escapeHtml(l.description)}</a></td>
            <td>${escapeHtml(l.provider)}</td>
            <td>${escapeHtml(l.model)}</td>
        </tr>`).join("");
    root.innerHTML = `<div class="ed-wrap">
        <header class="ed-header">
            <h1>LLM</h1>
            <span class="ed-spacer"></span>
            <button type="button" data-act="new">Nouveau LLM</button>
        </header>
        ${error ? `<div class="ed-error">${escapeHtml(error)}</div>` : ""}
        <table class="ed-table">
            <thead><tr><th>Description</th><th>Provider</th><th>Modèle</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
    </div>`;
    error = "";
};

const fetchList = async () => {
    try {
        list = await api.get<LLM[]>("editor/llm");
        renderList();
    } catch {
        error = "Impossible de charger la liste.";
        renderList();
    }
};

// ---------- edit ----------
const newLlm = (): LLM => ({
    id: 0,
    description: "",
    provider: "ollama",
    model: "",
    hasTools: false,
    hasJsonSchema: true,
});

const renderEdit = () => {
    const g = editing;
    if (!g) return;
    const isNew = editId === "new";
    root.innerHTML = `<div class="ed-wrap">
        <header class="ed-header">
            <button type="button" data-act="back">← Liste</button>
            <h2>${escapeHtml(g.description || "Nouveau LLM")}</h2>
            ${isNew ? "" : `<code>${g.id}</code>`}
            <span class="ed-spacer"></span>
            ${isNew ? "" : `<button type="button" data-act="delete">Effacer</button>`}
        </header>
        ${error ? `<div class="ed-error">${escapeHtml(error)}</div>` : ""}
        <form class="ed-form">
            <label>Description<input name="description" value="${escapeHtml(g.description)}" required maxlength="64"></label>
            <label>Provider<select name="provider" required>${providerOptions(g.provider)}</select></label>
            <label>Modèle<input name="model" value="${escapeHtml(g.model)}" required maxlength="128"></label>
            <label><input type="checkbox" name="hasTools"${g.hasTools ? " checked" : ""}>&nbsp;Outils (tools)</label>
            <label><input type="checkbox" name="hasJsonSchema"${g.hasJsonSchema ? " checked" : ""}>&nbsp;Schéma JSON</label>
            <div class="ed-actions"><button type="submit">Enregistrer</button></div>
        </form>
    </div>`;
    error = "";
    const form = root.querySelector("form.ed-form") as HTMLFormElement | null;
    if (form) form.addEventListener("submit", e => { e.preventDefault(); void save(); });
};

// Read the form fields back into `editing` before save.
const syncForm = () => {
    const g = editing;
    if (!g) return;
    const form = root.querySelector("form.ed-form") as HTMLFormElement | null;
    if (!form) return;
    const val = (name: string): string => (form.elements.namedItem(name) as any)?.value ?? "";
    const checked = (name: string): boolean => (form.elements.namedItem(name) as HTMLInputElement)?.checked ?? false;
    g.description = val("description");
    g.provider = val("provider");
    g.model = val("model");
    g.hasTools = checked("hasTools");
    g.hasJsonSchema = checked("hasJsonSchema");
};

const openLlm = (id: string) => {
    editId = id;
    if (id === "new") {
        editing = newLlm();
    } else {
        const found = list.find(l => l.id === Number(id));
        if (!found) { error = "LLM introuvable."; renderList(); return; }
        editing = { ...found };
    }
    history.pushState(null, "");   // one entry per open → browser back returns to list
    renderEdit();
};

const save = async () => {
    if (!editing) return;
    syncForm();
    const form = root.querySelector("form.ed-form") as HTMLFormElement | null;
    if (form && !form.checkValidity()) { form.reportValidity(); return; }
    try {
        await api.put(`editor/llm/${editId}`, editing);
        history.back();   // popstate → fetchList (refreshed list reflects the change)
    } catch {
        error = "Impossible d'enregistrer.";
        renderEdit();
    }
};

// ponytail: native confirm() blocks the thread; replace with an inline modal if blocking is undesirable.
const confirmDelete = async () => {
    if (!confirm("Effacer ce LLM ?")) return;
    try {
        await api.del(`editor/llm/${editId}`);
        history.back();
    } catch {
        error = "Impossible d'effacer.";
        renderEdit();
    }
};

// ---------- events ----------
document.addEventListener("click", e => {
    const t = e.target as HTMLElement;
    const openEl = t.closest("[data-open]") as HTMLElement | null;
    if (openEl) { e.preventDefault(); void openLlm(openEl.dataset.open ?? ""); return; }
    const actEl = t.closest("[data-act]") as HTMLElement | null;
    if (!actEl) return;
    e.preventDefault();
    const act = actEl.dataset.act;
    if (act === "new") void openLlm("new");
    else if (act === "back") history.back();
    else if (act === "delete") void confirmDelete();
});

// Browser back from an open LLM returns to the list.
window.addEventListener("popstate", () => { editId = ""; editing = null; void fetchList(); });

void fetchList();

export {};
