import * as App from "../core/app.js"
import { waitAsync, capitalize } from "../utils.js";


export interface GameList {
    code: string
    title: string
    promptfile: string
}

export interface GameDefinition {
    code: string | null
    title: string | null
    bg_url: string | null
    bg_image: string | null
    prompt: string | null
}

export interface Message {
    role: string,
    content: string
}


class State {
    private _username: string
    private _index: GameList[] = []
    private _game_definition: GameDefinition | undefined
    private _gameid: string | undefined

    constructor() {
        this._username = "laura"
        this.username = localStorage.getItem("username") ?? "laura"
    }

    set username(value: string) {
        this._username = value
        localStorage.setItem("username", value)
        const json = localStorage.getItem(value)
    }

    get username() {
        return this._username!
    }

    get usernameCapitalized() {
        return capitalize(this._username!)
    }

    get index() {
        return this._index!
    }

    get gameid() {
        return this._gameid!
    }

    get game_definition() {
        return this._game_definition!
    }


    //
    // Managing the localStorage
    //
    private getKey (what: string) {
        return `${this.username}_${this.gameid}_${what}`
    }

    getMessages (gameid?: string) {
        if (gameid != undefined)
            this._gameid = gameid

        const key = this.getKey("messages")
        const json = localStorage.getItem(key) ?? "[]"
        return JSON.parse(json) as Message[]
    }

    appendUserMessage (content: string, pageno: number) {
        let msgs = this.getMessages()

        // Truncate the message array so we can restart the story in the middle if we want
        msgs = msgs.slice(0, (pageno + 1) * 2)

        msgs.push(<Message>{ role: (pageno == -1 ? "system" : "user"), content })

        const key = this.getKey("messages")
        localStorage.setItem(key, JSON.stringify(msgs))
    }

    appendAssistantMessage (content: string) {
        const msgs = this.getMessages()
        msgs.push(<Message>{ role: "assistant", content })

        const key = this.getKey("messages")
        localStorage.setItem(key, JSON.stringify(msgs))
    }

    resetMessages () {
        this.appendUserMessage(this._game_definition!.prompt!, -1)
        return this._game_definition
    }

    lastPageNo() {
        const msgs = this.getMessages();
        if (msgs == undefined || msgs.length == 0)
            return -1
        return Math.floor((msgs.length - 1) / 2)
    }

    userMessageOnPage (pageno: number): string | null {
        // The user message at page 0 is the "system" message
        if (pageno == 0) {
            return null
        }

        const msgs = this.getMessages();
        return msgs[pageno * 2]?.content
    }

    userMessageOnNextPage (pageno: number) {
        const msgs = this.getMessages();
        return msgs[(pageno + 1) * 2]?.content
    }

    assistantMessageAtPage (pageno: number) {
        const msgs = this.getMessages();
        return msgs[1 + pageno * 2]?.content
    }



    //
    // Operations on the server
    //
    async fetch_index () {
        this._index = await App.GET("stories") as any
    }

    async fetch_game_definition (gameid: string) {
        this._gameid = gameid
        this._game_definition = await App.GET(`stories/${gameid}`) as any
        return this._game_definition
    }

    new_story () {
        this._game_definition = <GameDefinition> {
            code: "new",
            title: "Nouveau!",
            bg_image: "",
            prompt: "Tu es un assistant utile."
        }

        this._gameid = this._game_definition.code!
    }

    async save_story(newstate: any) {
        return App.PUT(`stories/${this.gameid}`, newstate)
    }

    async delete_story() {
        const key = this.getKey("messages")
        localStorage.removeItem(key)

        return App.DELETE(`stories/${this.gameid}`, {})
    }


    //
    // Interacting with the LLM endpoints
    //
    async executePrompt(user_prompt: string | null, streamUpdater?: (message: string) => void) {

        // Créer le prompt complet à partir de ce qu'il y a dans localStorage + user_prompt
        const messages = this.getMessages()
        if (user_prompt != undefined) {
            messages.push(<Message>{
                role: "user",
                content: user_prompt            
            })
        }
    
        const endpoint = App.apiurl(`stories/${this.gameid}/chat`)
        const query = {
            messages,
            stream: true,
            api: "ollama"
        }
    
        const response = await window.fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(query)
        })
    
        if (!response.body) {
            throw new Error("No response from LLM endpoint");
        }
    
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let answer = "";
    
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = decoder.decode(value, { stream: true })
            answer += text
            if (streamUpdater) streamUpdater(text);
        }

        return answer;
    }
}

export const state = new State();
