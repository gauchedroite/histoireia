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
type TTSModel = { id: number; description: string; model: string };
type Summary = { code: string; title: string; kindid: number; llmid: number };
type GameDef = {
    code: string; title: string; bg_image: string | null; music: string | null; prompt: string;
    llmid: number; kindid: number;
    update_users?: boolean;
    use_tts?: boolean;
    tts_model?: string | null;
    tts_voice?: string | null;
    editable_by_player?: boolean;
    enable_music?: boolean;
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
let ttsModels: TTSModel[] = [];
let ttsVoices: Record<number, string[]> = {};
let musicFiles: string[] = [];
let advKindId = 0;
let editing: GameDef | null = null;
let gameid = "";
let isNew = false;
let error = "";
let saved = "";

const escapeHtml = (s: string): string =>
    s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const kindText = (id: number): string => kinds.find(k => k.id === id)?.description ?? "";
const kindOptions = (selected: number) =>
    kinds.map(k => `<option value="${k.id}"${k.id === selected ? " selected" : ""}>${escapeHtml(k.description)}</option>`).join("");
const llmText = (id: number): string => llms.find(l => l.id === id)?.description ?? "";
const llmOptions = (selected: number) =>
    llms.map(l => `<option value="${l.id}"${l.id === selected ? " selected" : ""}>${escapeHtml(l.description)}</option>`).join("");

const ttsModelByValue = (model: string | null | undefined) => ttsModels.find(m => m.model === model);
const ttsModelOptions = (selected: string | null | undefined) =>
    [`<option value=""${!selected ? " selected" : ""}>—</option>`,
        ...ttsModels.map(m => `<option value="${escapeHtml(m.model)}"${m.model === selected ? " selected" : ""}>${escapeHtml(m.description)}</option>`)].join("");
const ttsVoiceOptions = (model: string | null | undefined, selected: string | null | undefined) => {
    const entry = ttsModelByValue(model);
    const voices = entry ? ttsVoices[entry.id] ?? [] : [];
    return [`<option value=""${!selected ? " selected" : ""}>—</option>`,
        ...voices.map(v => `<option value="${escapeHtml(v)}"${v === selected ? " selected" : ""}>${escapeHtml(v)}</option>`)].join("");
};
const loadTtsVoices = async (model: string | null | undefined) => {
    const entry = ttsModelByValue(model);
    if (!entry) return [];
    if (ttsVoices[entry.id]) return ttsVoices[entry.id];
    try {
        const data = await api.get<{ voices: string }>(`editor/tts/${entry.id}`);
        ttsVoices[entry.id] = data.voices.split(/\r?\n/).map(v => v.trim()).filter(Boolean);
    } catch {
        ttsVoices[entry.id] = [];
    }
    return ttsVoices[entry.id];
};

// ---------- list ----------
const musicOptions = (selected: string | null) =>
    [`<option value=""${!selected ? " selected" : ""}>—</option>`,
        ...musicFiles.map(f => `<option value="${escapeHtml(f)}"${f === selected ? " selected" : ""}>${escapeHtml(f)}</option>`)].join("");
const renderList = (games: Summary[]) => {
    const rows = games.map(g => `
        <tr>
            <td><a href="#" data-open="${escapeHtml(g.code)}">${escapeHtml(g.title)}</a></td>
            <td>${escapeHtml(kindText(g.kindid))}</td>
            <td>${g.kindid === advKindId ? "" : escapeHtml(llmText(g.llmid))}</td>
        </tr>`).join("");
    root.innerHTML = `<div class="ed-wrap">
        <header class="ed-header">
            <h1>Éditeur</h1>
            <span class="ed-spacer"></span>
            <a href="admin.html">Admin</a>
            <a href="index.html">Jeu</a>
            <button type="button" data-act="new">+</button>
        </header>
        ${error ? `<div class="ed-error">${escapeHtml(error)}</div>` : ""}
        <table class="ed-table">
            <thead><tr><th>Titre</th><th>Type</th><th>LLM</th></tr></thead>
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
    music: null,
    prompt: "Tu es un assistant utile.",
    llmid: llms[0]?.id ?? 1,
    kindid: kinds.find(k => k.code === "llm")?.id ?? kinds[0]?.id ?? 1,
    update_users: true,
    editable_by_player: false,
    enable_music: true,
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
           <label>LLM (modèle)<select name="llmid" required>${llmOptions(g.llmid)}</select></label>
           <label class="ed-check"><input type="checkbox" name="use_tts"${g.use_tts ? " checked" : ""}> Utiliser la synthèse vocale (TTS)</label>
           <label data-tts-model ${g.use_tts ? "" : "hidden"}>Modèle TTS<select name="tts_model" data-tts-model-select ${g.use_tts ? "" : "disabled"}>${ttsModelOptions(g.tts_model)}</select></label>
           <label data-tts-voice ${g.use_tts ? "" : "hidden"}>Voix TTS<select name="tts_voice" data-tts-voice-select ${g.use_tts ? "" : "disabled"}>${ttsVoiceOptions(g.tts_model, g.tts_voice)}</select></label>`;

    root.innerHTML = `<div class="ed-wrap">
        <header class="ed-header">
            <button type="button" data-act="back">←</button>
            <h2>${escapeHtml(g.title)}</h2>
            ${isNew ? "" : `<code>${escapeHtml(g.code)}</code>`}
            <span class="ed-spacer"></span>
            ${isNew ? "" : `<button type="button" data-act="delete">Effacer</button>`}
        </header>
        ${error ? `<div class="ed-error">${escapeHtml(error)}</div>` : ""}
        ${saved ? `<div class="ed-ok">${escapeHtml(saved)}</div>` : ""}
        <form class="ed-form">
            <label>Titre<input name="title" value="${escapeHtml(g.title ?? "")}" required maxlength="32"></label>
            <label>Type d'histoire${kindField}</label>
            ${bodyFields}
            <label class="ed-check"><input type="checkbox" name="enable_music"${g.enable_music !== false ? " checked" : ""}> Activer la musique</label>
            <label>Musique<select name="music" ${g.enable_music === false ? "disabled" : ""}>${musicOptions(g.music)}</select></label>
            <label>Image de la page titre<input name="bg_image" value="${escapeHtml(g.bg_image ?? "")}" maxlength="32"></label>
            ${isNew ? `<div class="ed-hint">Enregistre d'abord l'histoire pour téléverser une image.</div>` : `<input type="file" name="bg_image_file" accept="image/*">`}
            <label class="ed-check"><input type="checkbox" name="editable_by_player"${g.editable_by_player ? " checked" : ""}> Permettre au joueur de modifier la réponse du LLM</label>
            <label class="ed-check"><input type="checkbox" name="update_users"${g.update_users !== false ? " checked" : ""}> Mettre à jour le prompt des histoires en cours</label>
            <div class="ed-actions"><button type="submit">Enregistrer</button></div>
        </form>
    </div>`;
    error = "";
    saved = "";

    const form = root.querySelector("form.ed-form") as HTMLFormElement | null;
    if (form) {
        form.addEventListener("submit", e => { e.preventDefault(); void save(); });
        const kindSel = form.querySelector("[data-kind]") as HTMLSelectElement | null;
        if (kindSel) kindSel.addEventListener("change", () => { syncForm(); renderEdit(); });
        const ttsCheck = form.elements.namedItem("use_tts") as HTMLInputElement | null;
        if (ttsCheck) ttsCheck.addEventListener("change", () => { syncForm(); renderEdit(); });
        const enableMusicCheck = form.elements.namedItem("enable_music") as HTMLInputElement | null;
        if (enableMusicCheck) enableMusicCheck.addEventListener("change", () => { syncForm(); renderEdit(); });
        const ttsModelSel = form.querySelector("[data-tts-model-select]") as HTMLSelectElement | null;
        if (ttsModelSel) ttsModelSel.addEventListener("change", async () => {
            syncForm();
            await loadTtsVoices(editing?.tts_model);
            renderEdit();
        });
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
    g.music = val("music") || null;
    const kindSel = form.elements.namedItem("kindid") as HTMLSelectElement | null;
    const llmSel = form.elements.namedItem("llmid") as HTMLSelectElement | null;
    const updateUsers = form.elements.namedItem("update_users") as HTMLInputElement | null;
    const editableByPlayer = form.elements.namedItem("editable_by_player") as HTMLInputElement | null;
    const enableMusic = form.elements.namedItem("enable_music") as HTMLInputElement | null;
    const useTts = form.elements.namedItem("use_tts") as HTMLInputElement | null;
    const ttsModel = form.elements.namedItem("tts_model") as HTMLSelectElement | null;
    const ttsVoice = form.elements.namedItem("tts_voice") as HTMLSelectElement | null;
    if (kindSel) g.kindid = Number(kindSel.value);
    if (llmSel) g.llmid = Number(llmSel.value);
    if (updateUsers) g.update_users = updateUsers.checked;
    if (editableByPlayer) g.editable_by_player = editableByPlayer.checked;
    if (enableMusic) g.enable_music = enableMusic.checked;
    if (useTts) g.use_tts = useTts.checked;
    if (ttsModel) g.tts_model = ttsModel.value || null;
    if (ttsVoice) g.tts_voice = ttsVoice.value || null;
};

const openStory = async (id: string) => {
    gameid = id;
    isNew = (id === "new");
    try {
        editing = isNew ? newGame() : await api.get<GameDef>(`editor/stories/${id}`);
        if (editing?.use_tts && editing.tts_model) await loadTtsVoices(editing.tts_model);
        if (location.hash.slice(1) !== id) location.hash = id;
        renderEdit();
    } catch {
        error = "Impossible d'ouvrir l'histoire.";
        location.hash = "";
        await fetchList();
    }
};

const save = async () => {
    if (!editing) return;
    syncForm();
    const form = root.querySelector("form.ed-form") as HTMLFormElement | null;
    if (form && !form.checkValidity()) { form.reportValidity(); return; }
    try {
        const res = await api.put<{ gameid: string }>(`editor/stories/${gameid}`, editing);
        if (isNew) {   // adopt the server-generated id so further saves update, not duplicate
            gameid = res.gameid;
            editing.code = gameid;
            isNew = false;
            location.hash = gameid;
        }
        saved = "Enregistré.";
        renderEdit();
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

// Browser back/forward keeps the editor in sync with the URL hash.
window.addEventListener("popstate", () => {
    const id = location.hash.slice(1);
    if (id) void openStory(id);
    else void fetchList();
});

const init = async () => {
    [kinds, llms, musicFiles] = await Promise.all([
        api.get<Kind[]>("data/lookup/kind.json"),
        api.get<Llm[]>("data/lookup/llm.json"),
        api.get<{ files: string[] }>("editor/music").then(r => r.files),
    ]);
    try { ttsModels = await api.get<TTSModel[]>("editor/tts"); } catch { ttsModels = []; }
    advKindId = kinds.find(k => k.code === "adv")?.id ?? 0;
    const id = location.hash.slice(1);
    if (id) await openStory(id);
    else await fetchList();
};

void init();

export {};
