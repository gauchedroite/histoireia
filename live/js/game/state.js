import * as App from "../core/app.js";
import { capitalize } from "../utils.js";
class State {
    constructor() {
        var _a;
        this._index = [];
        this._localState = {};
        this._username = "laura";
        this.username = (_a = localStorage.getItem("username")) !== null && _a !== void 0 ? _a : "laura";
    }
    set username(value) {
        this._username = value;
        localStorage.setItem("username", value);
        const json = localStorage.getItem(value);
        this._localState = JSON.parse(json !== null && json !== void 0 ? json : "{}");
    }
    get username() {
        return this._username;
    }
    get usernameCapitalized() {
        return capitalize(this._username);
    }
    get index() {
        return this._index;
    }
    get gameid() {
        return this._gameid;
    }
    get game_definition() {
        return this._game_definition;
    }
    getKey(what) {
        return `${this.username}_${this.gameid}_${what}`;
    }
    getMessages() {
        var _a;
        const key = this.getKey("messages");
        const json = (_a = localStorage.getItem(key)) !== null && _a !== void 0 ? _a : "[]";
        return JSON.parse(json);
    }
    appendUserMessage(content, pageno) {
        let msgs = this.getMessages();
        msgs = msgs.slice(0, (pageno + 1) * 2);
        msgs.push({ role: "user", content });
        const key = this.getKey("messages");
        localStorage.setItem(key, JSON.stringify(msgs));
    }
    appendAssistantMessage(content) {
        const msgs = this.getMessages();
        msgs.push({ role: "assistant", content });
        const key = this.getKey("messages");
        localStorage.setItem(key, JSON.stringify(msgs));
    }
    resetMessages() {
        this.appendUserMessage(this._game_definition.prompt, -1);
        return this._game_definition;
    }
    lastPageNo() {
        const msgs = this.getMessages();
        if (msgs == undefined || msgs.length == 0)
            return -1;
        return Math.floor((msgs.length - 1) / 2);
    }
    userMessageOnPage(pageno) {
        var _a;
        const msgs = this.getMessages();
        return (_a = msgs[pageno * 2]) === null || _a === void 0 ? void 0 : _a.content;
    }
    userMessageOnNextPage(pageno) {
        var _a;
        const msgs = this.getMessages();
        return (_a = msgs[(pageno + 1) * 2]) === null || _a === void 0 ? void 0 : _a.content;
    }
    assistantMessageAtPage(pageno) {
        var _a;
        const msgs = this.getMessages();
        return (_a = msgs[1 + pageno * 2]) === null || _a === void 0 ? void 0 : _a.content;
    }
    async fetch_index() {
        return App.GET("assets/_index.json")
            .then((payload) => {
            this._index = payload;
        });
    }
    async fetch_game_definition(gameid) {
        await this.fetch_index();
        const game = this._index.find(one => one.code == gameid);
        const promptfile = game.promptfile;
        const response2 = await window.fetch(`assets/${promptfile}`);
        const prompt = await response2.text();
        const response = await window.fetch(`assets/${gameid}.json`);
        this._game_definition = await response.json();
        this._gameid = gameid;
        this._game_definition.prompt = prompt;
        return this._game_definition;
    }
    new_game_definition() {
        this._game_definition = {
            code: "new",
            title: "NEW",
            bg_url: "",
            prompt: "You are an helpful assistant"
        };
        this._gameid = this._game_definition.code;
    }
    async executePrompt(user_prompt, streamUpdater) {
        const messages = this.getMessages();
        messages.push({
            role: "user",
            content: user_prompt
        });
        const endpoint = "https://lebaudy.gauchedroite.com/api/chat";
        const query = {
            model: "lstep/neuraldaredevil-8b-abliterated:q8_0",
            messages,
            stream: true
        };
        const response = await window.fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(query)
        });
        if (!response.body) {
            throw new Error("Réponse vide du serveur");
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let answer = "";
        let buffer = "";
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            try {
                const jsonObjects = buffer.split("\n").filter(line => line.trim() !== "");
                buffer = "";
                for (const jsonObject of jsonObjects) {
                    try {
                        const chunk = JSON.parse(jsonObject);
                        if (!chunk.done) {
                            answer += chunk.message.content;
                            if (streamUpdater)
                                streamUpdater(chunk.message.content);
                        }
                    }
                    catch (err) {
                        buffer = jsonObject;
                    }
                }
            }
            catch (err) {
                console.error("Erreur lors du parsing JSON", err);
            }
        }
        return answer;
    }
}
export const state = new State();
