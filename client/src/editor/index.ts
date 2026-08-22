// Editor — standalone desktop admin. No framework: plain DOM + fetch + history.
//
// Endpoints (no Express auth — gated by Caddy on /histoireia/editor*):
//   GET    /editor/stories           -> Summary[]
//   GET    /editor/stories/:id       -> GameDef
//   PUT    /editor/stories/:id      -> { gameid }   (id "new" creates)
//   DELETE /editor/stories/:id      -> 204
//   GET    /data/lookup/kind.json    -> Kind[]
//   GET    /data/lookup/llm.json     -> Llm[]

type Kind = { id: number; code: string; description: string };
type Llm = { id: number; description: string };
type Summary = { code: string; title: string; kindid: number };
type GameDef = {
    code: string; title: string; bg_image: string | null; prompt: string;
    llmid: number; kindid: number;
};

const root = document.getElementById("app_root") as HTMLElement;

const api = {
    get: <T>(u: string): Promise<T> => fetch(u).then(async r => { if (!r.ok) throw new Error(`${r.status}`); return (await r.json()) as T; }),
    put: <T>(u: string, body: unknown): Promise<T> => fetch(u, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
    }).then(async r => { if (!r.ok) throw new Error(`${r.status}`); return (await r.json()) as T; }),
    del: (u: string): Promise<void> => fetch(u, { method: "DELETE" }).then(r => { if (!r.ok) throw new Error(`${r.status}`); }),
};

let kinds: Kind[] = [];
let llms: Llm[] = [];
let advKindId = 0;
let editing: GameDef | null = null;
let gameid = "";
let isNew = false;
let error = "";

const escapeHtml = (s: string): string =>
    s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const kindText = (id: number): string => kinds.find(k => k.id === id)?.description ?? "";
const kindOptions = (selected: number) =>
    kinds.map(k => `<option value="${k.id}"${k.id === selected ? " selected" : ""}>${escapeHtml(k.description)}</option>`).join("");
const llmOptions = (selected: number) =>
    llms.map(l => `<option value="${l.id}"${l.id === selected ? " selected" : ""}>${escapeHtml(l.description)}</option>`).join("");

// ---------- list ----------
const renderList = (games: Summary[]) => {
    const rows = games.map(g => `
        <tr>
            <td><a href="#" data-open="${escapeHtml(g.code)}">${escapeHtml(g.title)}</a></td>
            <td>${escapeHtml(kindText(g.kindid))}</td>
        </tr>`).join("");
    root.innerHTML = `<div class="ed-wrap">
        <header class="ed-header">
            <h1>Éditeur</h1>
            <span class="ed-spacer"></span>
            <button type="button" data-act="new">Nouvelle histoire</button>
        </header>
        ${error ? `<div class="ed-error">${escapeHtml(error)}</div>` : ""}
        <table class="ed-table">
            <thead><tr><th>Titre</th><th>Type</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
    </div>`;
    error = "";
};

const fetchList = async () => {
    try {
        renderList(await api.get<Summary[]>("editor/stories"));
    } catch {
        error = "Impossible de charger la liste.";
        renderList([]);
    }
};

// ---------- edit ----------
const newGame = (): GameDef => ({
    code: "new",
    title: "Nouvelle histoire",
    bg_image: null,
    prompt: "Tu es un assistant utile.",
    llmid: llms[0]?.id ?? 1,
    kindid: kinds.find(k => k.code === "llm")?.id ?? kinds[0]?.id ?? 1,
});

const renderEdit = () => {
    const g = editing;
    if (!g) return;
    const isAdv = g.kindid === advKindId;
    const kindField = isNew
        ? `<select name="kindid" data-kind>${kindOptions(g.kindid)}</select>`
        : `<select name="kindid" disabled>${kindOptions(g.kindid)}</select>`;
    const bodyFields = isAdv
        ? `<label>Données (TSV)<textarea name="prompt" rows="18" required>${escapeHtml(g.prompt ?? "")}</textarea></label>`
        : `<label>Prompt<textarea name="prompt" rows="14" required maxlength="8192">${escapeHtml(g.prompt ?? "")}</textarea></label>
           <label>LLM (modèle)<select name="llmid" required>${llmOptions(g.llmid)}</select></label>`;

    root.innerHTML = `<div class="ed-wrap">
        <header class="ed-header">
            <button type="button" data-act="back">← Liste</button>
            <h2>${escapeHtml(g.title)}</h2>
            ${isNew ? "" : `<code>${escapeHtml(g.code)}</code>`}
            <span class="ed-spacer"></span>
            ${isNew ? "" : `<button type="button" data-act="delete">Effacer</button>`}
        </header>
        ${error ? `<div class="ed-error">${escapeHtml(error)}</div>` : ""}
        <form class="ed-form">
            <label>Titre<input name="title" value="${escapeHtml(g.title ?? "")}" required maxlength="32"></label>
            <label>Type d'histoire${kindField}</label>
            ${bodyFields}
            <label>Image de la page titre<input name="bg_image" value="${escapeHtml(g.bg_image ?? "")}" maxlength="32"></label>
            ${isNew ? `<div class="ed-hint">Enregistre d'abord l'histoire pour téléverser une image.</div>` : `<label>Téléverser une image<input type="file" name="bg_image_file" accept="image/*"></label>`}
            <div class="ed-actions"><button type="submit">Enregistrer</button></div>
        </form>
    </div>`;
    error = "";

    const form = root.querySelector("form.ed-form") as HTMLFormElement | null;
    if (form) {
        form.addEventListener("submit", e => { e.preventDefault(); void save(); });
        const kindSel = form.querySelector("[data-kind]") as HTMLSelectElement | null;
        if (kindSel) kindSel.addEventListener("change", () => { syncForm(); renderEdit(); });
        const fileInput = form.elements.namedItem("bg_image_file") as HTMLInputElement | null;
        if (fileInput) fileInput.addEventListener("change", () => { const f = fileInput.files?.[0]; if (f) void uploadImage(f); });
    }
};

// Read the form fields back into `editing` (used on kind-change and on save).
const syncForm = () => {
    const g = editing;
    if (!g) return;
    const form = root.querySelector("form.ed-form") as HTMLFormElement | null;
    if (!form) return;
    const val = (name: string): string => (form.elements.namedItem(name) as any)?.value ?? "";
    g.title = val("title");
    g.prompt = val("prompt");
    g.bg_image = val("bg_image") || null;
    const kindSel = form.elements.namedItem("kindid") as HTMLSelectElement | null;
    const llmSel = form.elements.namedItem("llmid") as HTMLSelectElement | null;
    if (kindSel) g.kindid = Number(kindSel.value);
    if (llmSel) g.llmid = Number(llmSel.value);
};

const openStory = async (id: string) => {
    gameid = id;
    isNew = (id === "new");
    try {
        editing = isNew ? newGame() : await api.get<GameDef>(`editor/stories/${id}`);
        history.pushState(null, "");   // one entry per open → browser back returns to list
        renderEdit();
    } catch {
        error = "Impossible d'ouvrir l'histoire.";
        await fetchList();
    }
};

const save = async () => {
    if (!editing) return;
    syncForm();
    const form = root.querySelector("form.ed-form") as HTMLFormElement | null;
    if (form && !form.checkValidity()) { form.reportValidity(); return; }
    try {
        await api.put(`editor/stories/${gameid}`, editing);
        history.back();   // popstate → fetchList (refreshed list reflects the change)
    } catch {
        error = "Impossible d'enregistrer.";
        renderEdit();
    }
};

// ponytail: raw octet-stream body, filename in the query — no multipart/form-data lib.
const uploadImage = async (file: File) => {
    if (!editing || isNew) return;
    try {
        const buf = await file.arrayBuffer();
        const res = await fetch(`editor/stories/${gameid}/image?filename=${encodeURIComponent(file.name)}`, {
            method: "POST",
            headers: { "Content-Type": "application/octet-stream" },
            body: buf,
        });
        if (!res.ok) throw new Error(`${res.status}`);
        editing.bg_image = (await res.json() as { filename: string }).filename;
        renderEdit();
    } catch {
        error = "Impossible de téléverser l'image.";
        renderEdit();
    }
};

// ponytail: native confirm() blocks the thread; replace with an inline modal if blocking is undesirable.
const confirmDelete = async () => {
    if (!confirm("Effacer cette histoire ?")) return;
    try {
        await api.del(`editor/stories/${gameid}`);
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
    if (openEl) { e.preventDefault(); void openStory(openEl.dataset.open ?? ""); return; }
    const actEl = t.closest("[data-act]") as HTMLElement | null;
    if (!actEl) return;
    e.preventDefault();
    const act = actEl.dataset.act;
    if (act === "new") void openStory("new");
    else if (act === "back") history.back();
    else if (act === "delete") void confirmDelete();
});

// Browser back from an open story returns to the list.
window.addEventListener("popstate", () => { void fetchList(); });

const init = async () => {
    [kinds, llms] = await Promise.all([
        api.get<Kind[]>("data/lookup/kind.json"),
        api.get<Llm[]>("data/lookup/llm.json"),
    ]);
    advKindId = kinds.find(k => k.code === "adv")?.id ?? 0;
    await fetchList();
};

void init();

export {};
