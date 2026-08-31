// TTS model editor — standalone desktop admin. Mirrors llm/index.ts.
//
// Endpoints (no Express auth — gated by Caddy on /histoireia/editor*):
//   GET    /editor/tts        -> TTSModel[]
//   GET    /editor/tts/:id    -> TTSModel & { voices: string }
//   PUT    /editor/tts/:id    -> { id }   (id "new" creates)
//   DELETE /editor/tts/:id    -> 204
//
// Provider is always OpenRouter; the editor only stores description + model id.
// Voices are edited as plain CSV (one voice per line).

type TTSModel = {
    id: number;
    description: string;
    model: string;
};

type TTSModelWithVoices = TTSModel & { voices: string };

const root = document.getElementById("app_root") as HTMLElement;

const api = {
    get: <T>(u: string): Promise<T> => fetch(u).then(async r => { if (!r.ok) throw new Error(`${r.status}`); return (await r.json()) as T; }),
    put: <T>(u: string, body: unknown): Promise<T> => fetch(u, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
    }).then(async r => { if (!r.ok) throw new Error(`${r.status}`); return (await r.json()) as T; }),
    del: (u: string): Promise<void> => fetch(u, { method: "DELETE" }).then(r => { if (!r.ok) throw new Error(`${r.status}`); }),
};

let list: TTSModel[] = [];
let editing: TTSModelWithVoices | null = null;
let editId = "";
let error = "";
let saved = "";

const escapeHtml = (s: string): string =>
    s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

// ---------- list ----------
const renderList = () => {
    const rows = list.map(m => `
        <tr>
            <td><a href="#" data-open="${m.id}">${escapeHtml(m.description)}</a></td>
            <td><code>${escapeHtml(m.model)}</code></td>
        </tr>`).join("");
    root.innerHTML = `<div class="ed-wrap">
        <header class="ed-header">
            <h1>TTS</h1>
            <span class="ed-spacer"></span>
            <a href="admin.html">Admin</a>
            <a href="index.html">Jeu</a>
            <button type="button" data-act="new">+</button>
        </header>
        ${error ? `<div class="ed-error">${escapeHtml(error)}</div>` : ""}
        <table class="ed-table">
            <thead><tr><th>Description</th><th>Modèle</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
    </div>`;
    error = "";
};

const fetchList = async () => {
    try {
        list = await api.get<TTSModel[]>("editor/tts");
        renderList();
    } catch {
        error = "Impossible de charger la liste.";
        renderList();
    }
};

// ---------- edit ----------
const newTts = (): TTSModelWithVoices => ({
    id: 0,
    description: "",
    model: "",
    voices: "",
});

const renderEdit = () => {
    const g = editing;
    if (!g) return;
    const isNew = editId === "new";
    root.innerHTML = `<div class="ed-wrap">
        <header class="ed-header">
            <button type="button" data-act="back">←</button>
            <h2>${escapeHtml(g.description || "Nouveau modèle TTS")}</h2>
            ${isNew ? "" : `<code>${g.id}</code>`}
            <span class="ed-spacer"></span>
            ${isNew ? "" : `<button type="button" data-act="delete">Effacer</button>`}
        </header>
        ${error ? `<div class="ed-error">${escapeHtml(error)}</div>` : ""}
        ${saved ? `<div class="ed-ok">${escapeHtml(saved)}</div>` : ""}
        <form class="ed-form">
            <label>Description<input name="description" value="${escapeHtml(g.description)}" required maxlength="64"></label>
            <label>Modèle OpenRouter<input name="model" value="${escapeHtml(g.model)}" required maxlength="128" placeholder="openai/tts-1"></label>
            <label>Voix (CSV)<textarea name="voices" rows="14" placeholder="alloy&#10;echo&#10;fable">${escapeHtml(g.voices)}</textarea></label>
            <div class="ed-actions"><button type="submit">Enregistrer</button></div>
        </form>
    </div>`;
    error = "";
    saved = "";
    const form = root.querySelector("form.ed-form") as HTMLFormElement | null;
    if (form) form.addEventListener("submit", e => { e.preventDefault(); void save(); });
};

const syncForm = () => {
    const g = editing;
    if (!g) return;
    const form = root.querySelector("form.ed-form") as HTMLFormElement | null;
    if (!form) return;
    const val = (name: string): string => (form.elements.namedItem(name) as any)?.value ?? "";
    g.description = val("description");
    g.model = val("model");
    g.voices = val("voices");
};

const openTts = async (id: string) => {
    editId = id;
    if (id === "new") {
        editing = newTts();
        if (location.hash.slice(1) !== id) location.hash = id;
        renderEdit();
        return;
    }
    try {
        editing = await api.get<TTSModelWithVoices>(`editor/tts/${id}`);
        if (location.hash.slice(1) !== id) location.hash = id;
        renderEdit();
    } catch {
        error = "Impossible d'ouvrir le modèle TTS.";
        location.hash = "";
        await fetchList();
    }
};

const showByHash = async (id: string) => {
    if (id === "new") { openTts("new"); return; }
    await fetchList();
    await openTts(id);
};

const save = async () => {
    if (!editing) return;
    syncForm();
    const form = root.querySelector("form.ed-form") as HTMLFormElement | null;
    if (form && !form.checkValidity()) { form.reportValidity(); return; }
    try {
        const { id, ...body } = editing;
        const res = await api.put<{ id: number }>(`editor/tts/${editId}`, body);
        if (editId === "new" && res.id) {
            editId = String(res.id);
            editing.id = res.id;
            location.hash = editId;
        }
        saved = "Enregistré.";
        renderEdit();
    } catch {
        error = "Impossible d'enregistrer.";
        renderEdit();
    }
};

const confirmDelete = async () => {
    if (!confirm("Effacer ce modèle TTS ?")) return;
    try {
        await api.del(`editor/tts/${editId}`);
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
    if (openEl) { e.preventDefault(); void openTts(openEl.dataset.open ?? ""); return; }
    const actEl = t.closest("[data-act]") as HTMLElement | null;
    if (!actEl) return;
    e.preventDefault();
    const act = actEl.dataset.act;
    if (act === "new") void openTts("new");
    else if (act === "back") history.back();
    else if (act === "delete") void confirmDelete();
});

window.addEventListener("popstate", () => {
    const id = location.hash.slice(1);
    if (id) void showByHash(id);
    else { editId = ""; editing = null; void fetchList(); }
});

const id = location.hash.slice(1);
if (id) void showByHash(id);
else void fetchList();

export {};
