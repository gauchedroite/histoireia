import * as App from "../../core/app.js"
import * as Router from "../../core/router.js"
import * as Misc from "../../core/misc.js"
import * as Theme from "../../core/theme/theme.js"
import { marked } from "marked"
marked.use({ breaks: true })   // single \n → <br>, like the old <br> rendering
import { state, GameDefinition, IChoice } from "./state.js"

export const NS = "GSTORY";


let mystate: GameDefinition
let gameid = ""
let pageno = 0
let lastPageNo = 0
let isNew = false
let user_text: string | null = null;
let assistant_text: string | null = null
let next_user_text: string | null = null
let editable = false
let helping = false
let choices: IChoice[];

// Background music for the story screen. Looping <audio>, started when the
// story context is active and the game has a music file, stopped on leave.
// ponytail: one module-level element, no player UI — add controls if needed.
let audio: HTMLAudioElement | null = null;
let musicPlaying = true;
const stopMusic = () => { if (audio) { audio.pause(); audio = null; } };
export const musicToggle = () => {
    musicPlaying = !musicPlaying;
    if (audio) {
        if (musicPlaying) void audio.play().catch(() => {});
        else audio.pause();
    }
    App.render();
};

let voiceOn = localStorage.getItem("gstory_voice") === "1";
let listening = false;
let voicePrimed = false;
let frVoice: SpeechSynthesisVoice | null = null;
const pickVoice = () => {
    // iOS loads voices async and often refuses to speak without an explicit voice.
    frVoice = speechSynthesis.getVoices().find(v => v.lang === "fr-CA")
        ?? speechSynthesis.getVoices().find(v => v.lang.startsWith("fr")) ?? null;
};
if ("speechSynthesis" in window) {
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
}
let recognition: any = null;
const primeVoice = () => {
    if (voicePrimed || !("speechSynthesis" in window)) return;
    const silent = new SpeechSynthesisUtterance(" ");
    silent.volume = 0;
    speechSynthesis.speak(silent);
    voicePrimed = true;
};
const stripMarkdown = (s: string) => s.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[#*_>`]/g, "");
// GPT-4o TTS via the server proxy (POST /tts) — used when the story has use_tts.
// ponytail: one shared element — iOS only allows play() on an element that was
// already unlocked by playing audio inside a user gesture (see ttsUnlock).
const ttsAudio = new Audio();
const stopTts = () => { ttsLoading = false; ttsAudio.pause(); };
let ttsPage = -1;   // which page the loaded clip belongs to
let ttsLoading = false;
["play", "pause", "ended"].forEach(ev => ttsAudio.addEventListener(ev, () => App.render()));
// Tiny silent mp3, played during a header-button tap to unlock TTS audio on iOS.
const ttsUnlock = () => {
    ttsAudio.src = "data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQxAADB8AhSmxhIIEVCSiJrDCQBTcu3UrAIwUdkRgQbFAZC1CQEwTJ9mjRvBA4UOLD8nKVOWfh+UlK3z/177OXrfOdKl7pyn3Xf//WreyTRUoAWgBgkOAGbZHBgG1OF6zM82DWbZaUmMBptgQhGjsyYqc9ae9XFz280948NMBWInljyzsNRFLPWdnZGWrddDsjK1unuSrVN9jJsK8KuQtQCtMBjCEtImISdNKJOopIpBFpNSMbIHCSRpRR5iakjTiyzLhchUUBwCgyKiweBv/7UsQbg8isVNoMPMjAAAA0gAAABEVFGmgqK////9bP/6XCykxBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq";
    ttsAudio.play().catch(() => {});
};
const speakAi = async (text: string) => {
    ttsLoading = true;
    App.render();
    ttsAudio.pause();
    try {
        const r = await window.fetch(App.apiurl("tts"), {
            method: "POST",
            headers: {
                "Content-type": "application/json",
                ...(App.getAuthHeader() ? { "Authorization": `Bearer ${App.getAuthHeader()}` } : {}),
            },
            credentials: "include",
            body: JSON.stringify({ text: stripMarkdown(text), model: mystate?.tts_model, voice: mystate?.tts_voice }),
        });
        if (!r.ok) throw new Error(`${r.status}`);
        ttsPage = pageno;
        ttsAudio.src = URL.createObjectURL(await r.blob());
        void ttsAudio.play().catch(err => console.error("TTS play:", err));
    }
    catch (err) {
        console.error("TTS:", err);
        ttsLoading = false;
        App.render();
        speakBrowser(text);   // fallback to browser speech synthesis
        return;
    }
    ttsLoading = false;
    App.render();
};
const speakBrowser = (text: string) => {
    if (!voiceOn || !text || !("speechSynthesis" in window)) return;
    primeVoice();
    speechSynthesis.cancel();
    setTimeout(() => {
        // ponytail: sentence-chunked queue — iOS silently drops or truncates long
        // utterances (~15s cap); add a proper player UI if chunk gaps annoy.
        const sentences = stripMarkdown(text).match(/[^.!?\n]+[.!?]*/g) ?? [text];
        let chunk = "";
        for (const sentence of sentences) {
            if (chunk && chunk.length + sentence.length > 180) {
                const utter = new SpeechSynthesisUtterance(chunk.trim());
                utter.lang = "fr-CA";
                if (frVoice) utter.voice = frVoice;
                speechSynthesis.speak(utter);
                chunk = "";
            }
            chunk += sentence;
        }
        if (chunk.trim()) {
            const utter = new SpeechSynthesisUtterance(chunk);
            utter.lang = "fr-CA";
            if (frVoice) utter.voice = frVoice;
            speechSynthesis.speak(utter);
        }
    }, 50);
};
const speak = (text: string) => {
    if (!voiceOn || !text) return;
    if (mystate?.use_tts) { void speakAi(text); return; }
    speakBrowser(text);
};
// Header buttons: play/pause toggle + replay, current page only.
export const ttsToggle = () => {
    if (ttsLoading) return;
    if (!ttsAudio.paused) { ttsAudio.pause(); }
    else if (ttsAudio.src && ttsPage === pageno && !ttsAudio.ended) {
        if (!voiceOn) { voiceOn = true; localStorage.setItem("gstory_voice", "1"); }
        void ttsAudio.play().catch(err => console.error("TTS play:", err));
    }
    else if (assistant_text) {
        if (!voiceOn) { voiceOn = true; localStorage.setItem("gstory_voice", "1"); }
        speak(assistant_text);
    }
    App.render();
};
export const ttsReplay = () => {
    if (ttsLoading) return;
    if (ttsAudio.src && ttsPage === pageno) {
        if (!voiceOn) { voiceOn = true; localStorage.setItem("gstory_voice", "1"); ttsUnlock(); }
        ttsAudio.currentTime = 0;
        void ttsAudio.play().catch(err => console.error("TTS replay:", err));
    }
    else if (assistant_text) {
        if (!voiceOn) { voiceOn = true; localStorage.setItem("gstory_voice", "1"); }
        speak(assistant_text);
    }
    App.render();
};
export const toggleVoice = () => {
    voiceOn = !voiceOn;
    localStorage.setItem("gstory_voice", voiceOn ? "1" : "0");
    if (voiceOn) { primeVoice(); ttsUnlock(); } else { speechSynthesis.cancel(); stopTts(); }
    App.render();
};
export const listen = () => {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) { alert("La dictée n'est pas disponible sur ce navigateur."); return; }
    if (listening) { recognition?.abort(); recognition = null; listening = false; App.render(); return; }
    recognition = new SR();
    recognition.lang = "fr-CA";
    recognition.onstart = () => { listening = true; App.render(); };
    recognition.onresult = (e: any) => {
        const ta = document.getElementById(`${NS}_next_user_text`) as HTMLTextAreaElement | null;
        if (ta) { ta.value = e.results[0][0].transcript; oninput(ta); }
    };
    recognition.onend = () => { listening = false; App.render(); };
    recognition.onerror = (e: any) => console.error("Dictée:", e.error);
    recognition.start();
};
const ensureMusic = (file: string | null) => {
    if (!file) { stopMusic(); return; }
    const src = App.url(`assets_app/music/${encodeURIComponent(file)}`);
    if (audio && audio.dataset.src === src) return;
    stopMusic();
    audio = new Audio(src);
    audio.loop = true;
    audio.dataset.src = src;
    if (musicPlaying) void audio.play().catch(() => {});
};



const formTemplate = () => {
    const add = (row: string) => rows.push(row);
    let rows: string[] = [];
    
    if (pageno > 0)
        add(`<div class="user">${user_text?.replace(/\n/g, "<br>")}</div>`)

    add(`<div id="ct_response" ${editable ? "contentEditable" : ""}>${assistant_text ? marked.parse(assistant_text) as string : ""}</div>`)

    if (assistant_text && assistant_text.length > 0) {
        const submitDisabled = (next_user_text == undefined || next_user_text.length == 0)
        const helpDisabled = false

        let help = ""
        if (mystate.hasJsonSchema) {
            help = `<button type="button" onclick="${NS}.help(true)" ${helpDisabled ? "disabled" : ""}><i class="fa-light fa-question"></i></button>`
            if (helping)
                help = `<button type="button" onclick="${NS}.help(false)" ${helpDisabled ? "disabled" : ""}><i class="fa-light fa-arrow-rotate-left"></i></button>`
        }

        const submit = `<button type="submit" onclick="${NS}.submit()" ${submitDisabled ? "disabled" : ""}><i class="fa-light fa-arrow-up"></i></button>`
        const mic = `<button type="button" class="${listening ? "listening" : ""}" onclick="${NS}.listen()"><i class="fa-light fa-microphone"></i></button>`
        const label = `<div class="ask">
                <div><b>À toi, ${state.usernameCapitalized} :</b></div>
                <div>${help} ${mic} ${submit}</div>
            </div>`
        add(label)

        if (!helping) {
            const option = <Theme.IOptText>{
                required: true,
                oninput: `${NS}.oninput(this)`,
                rows: 4
            }
            const textarea = Theme.renderFieldTextarea(NS, "next_user_text", next_user_text, "", option)
            add(`<div class="input">${textarea}</div>`)
        }
        else {
            const divs = choices.map((one, index) => `<div onclick="${NS}.selectChoice(${index})">${one.description}</div>`)
            add(`<div class="choices">${divs.join("")}</div>`)
        }
    }

    return rows.join("")
}

const pageTemplate = (form: string) => {
    let prev_url = `#/story/${gameid}/${pageno - 1}`
    let first_url = `#/story/${gameid}/0`
    let prev_disabled = (pageno == 0 ? "disabled" : "")

    let next_url = `#/story/${gameid}/${pageno + 1}`
    let last_url = `#/story/${gameid}/${lastPageNo}`
    let next_disabled = (pageno == lastPageNo ? "disabled" : "")

    return `
<div class="app-header">
    <a class="js-waitable-2" href="#/menu/${gameid}">
        <i class="fa-regular fa-chevron-left"></i>&nbsp;<span>${mystate.title}</span>
    </a>
    ${mystate.music && mystate.enable_music !== false ? `
    <a class="js-waitable-2" href="#" onclick="${NS}.musicToggle();return false;" title="Musique">
        <i class="fa-thin ${audio?.paused ? "fa-music-slash" : "fa-music"}"></i>
    </a>
    ` : ""}
    ${mystate.use_tts ? `
    <a class="js-waitable-2" href="#" onclick="${NS}.toggleVoice();return false;">
        <i class="fa-thin ${voiceOn ? "fa-volume" : "fa-volume-xmark"}"></i>
    </a>
    <a class="js-waitable-2" href="#" onclick="${NS}.ttsToggle();return false;" title="${ttsLoading ? "Chargement..." : "Lire / pause"}">
        <i class="${ttsLoading ? "fa-solid fa-spinner fa-spin" : `fa-thin ${!ttsAudio.paused && !ttsAudio.ended ? "fa-pause" : "fa-play"}`}"></i>
    </a>
    <a class="js-waitable-2" href="#" onclick="${NS}.ttsReplay();return false;" title="Rejouer">
        <i class="fa-thin fa-rotate-right"></i>
    </a>
    ` : ""}
    ${mystate.editable_by_player ? `
    <a class="js-waitable-2" href="#" onclick="${NS}.toggleEditable();return false;">
        <i class="fa-thin ${editable ? "fa-pen-slash" : "fa-pen-to-square"}"></i>
    </a>
    ` : ""}
</div>
<div class="app-content js-waitable-2">
    ${form}
</div>
<div class="app-footer js-waitable-2">
    <button type="button" onclick="window.location='${first_url}'" ${prev_disabled} title="prev"><i class="fa-solid fa-left-to-line"></i></button>
    <button type="button" onclick="window.location='${prev_url}'" ${prev_disabled} title="prev"><i class="fa-solid fa-left"></i></button>
    <div>${pageno + 1}/${lastPageNo + 1}</div>
    <button type="button" onclick="window.location='${next_url}'" ${next_disabled} title="next"><i class="fa-solid fa-right"></i></button>
    <button type="button" onclick="window.location='${last_url}'" ${next_disabled} title="next"><i class="fa-solid fa-right-to-line"></i></button>
</div>
`
}

let streamed = ""
const streamUpdater = (message: string) => {
    App.untransitionUI()

    streamed += message
    const el = document.getElementById("ct_response")
    if (el) el.innerHTML = marked.parse(streamed) as string
}


const render_and_fetch_more = async () => {
    user_text = state.userMessageOnPage(pageno)
    assistant_text = state.assistantMessageOnPage(pageno)
    next_user_text = state.userMessageOnNextPage(pageno)
    lastPageNo = state.lastPageNo()

    App.render()

    if (assistant_text == undefined) {
        streamed = ""
        App.transitionUI()
        try {
            assistant_text = await state.chatAsync(streamUpdater)
            await state.setAssistantMessageAsync(assistant_text, pageno)
        }
        catch (err) {
            assistant_text = "Le serveur ne répond pas. Vérifie qu'Ollama est bien démarré."
            console.error("Chat error:", err)
        }

        App.render()
    }
    else {
        App.untransitionUI()
    }
}

export const fetch = (args: string[] | undefined) => {
    stopTts();   // leaving a page stops its narration
    gameid = (args ? args[0] : "");
    pageno = +(args ? (args[1] != undefined ? args[1] : "new") : "new");
    isNew = isNaN(pageno)
    editable = false
    helping = false

    if (isNew) {
        assistant_text = null
        next_user_text = null

        Promise.all
            ([
                state.fetchGameDefinitionAsync(gameid),
                state.fetchStorySoFarAsync(gameid)
            ])
            .then((payloads: any) => {
                mystate = Misc.clone(payloads[0]) as GameDefinition
            })
            .then(() => { state.resetMessagesAsync() })
            .then(() => { Router.goto(`#/story/${gameid}/0`, 1) })
    }
    else {
        App.prepareRender(NS, "Story", "screen_story")
        Promise.all
            ([
                state.fetchGameDefinitionAsync(gameid),
                state.fetchStorySoFarAsync(gameid)
            ])
            .then((payloads: any) => {
                mystate = Misc.clone(payloads[0]) as GameDefinition
            })
            .then(render_and_fetch_more)
            .catch(render_and_fetch_more)
    }
}

export const render = () => {
    if (!App.inContext(NS)) { stopMusic(); musicPlaying = true; stopTts(); speechSynthesis?.cancel(); return ""; }
    ensureMusic(mystate?.enable_music === false ? null : (mystate?.music ?? null));

    const form = formTemplate()
    return pageTemplate(form)
}

export const postRender = () => {
    if (!App.inContext(NS)) return
}


const getFormState = () => {
    next_user_text = Misc.fromInputText(`${NS}_next_user_text`, next_user_text);
}

export const onchange = (_input: HTMLInputElement | HTMLTextAreaElement) => {
    getFormState();
    App.render();
}

export const oninput = (_input: HTMLInputElement | HTMLTextAreaElement) => {
    getFormState();
    App.render();
}



// If the user just typed a number, replace it with that item from the LAST
// numbered list in the LLM text. ponytail: line-based regex, no markdown AST —
// keeps the last matching line, which is the latest list containing that number.
const expandNumber = (input: string, llmText: string | null): string => {
    const trimmed = input.trim();
    const words = trimmed.split(/\s+/);
    // A short phrase (≤10 words) ending with a number, number word (un…dix), or
    // letter a–j (trailing punctuation stripped): that token is the choice, the
    // rest is discarded. Only 1–10 are valid.
    const last = words[words.length - 1].replace(/[.,;:!?)]+$/, "").toLowerCase();
    const numberWords: Record<string, number> = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10 };
    let n: string;
    if (words.length <= 10 && /^[a-j]$/i.test(last)) n = String(last.charCodeAt(0) - 96);
    else if (words.length <= 10 && /^\d+$/.test(last) && +last >= 1 && +last <= 10) n = last;
    else if (words.length <= 10 && last in numberWords) n = String(numberWords[last]);
    else n = trimmed;
    if (!/^\d+$/.test(n) || !llmText) return input;
    let result: string | null = null;
    for (const line of llmText.split("\n")) {
        const m = line.match(/^\s*\**\s*(\d+)\s*[.):]\s*\**\s*(.+)/);
        if (m && m[1] === n) result = m[2].replace(/\*\*/g, "").replace(/^#+\s*/, "").trim();
    }
    return result ?? input;
}

export const submit = async (_input: HTMLInputElement) => {
    await state.addUserMessageAsync(expandNumber(next_user_text!, assistant_text), pageno)

    next_user_text = null
    assistant_text = null

    Router.goto(`#/story/${gameid}/${pageno + 1}`)
}

export const help = async (yesno: boolean) => {
    App.transitionUI()
    
    helping = yesno
    if (helping) {
        const extra = await state.chatExtraAsync("3_choix")
        choices = extra.choices
    }

    App.untransitionUI()
    App.render()
}

export const selectChoice = (index: number) => {
    helping = false
    next_user_text = choices[index].description
    App.render()
}

export const toggleEditable = async () => {
    if (editable) {
        const element = document.getElementById("ct_response")
        if (element) {
            assistant_text = element.innerText
            await state.setAssistantMessageAsync(assistant_text, pageno)
        }
    }
    editable = !editable
    App.render()
}
