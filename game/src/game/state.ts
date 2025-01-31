import * as App from "../core/app.js"
import { waitAsync, capitalize } from "../utils.js";

export interface GameList {
    code: string
    title: string
}

export interface GameDefinition {
    code: string | null
    title: string | null
    bg_url: string | null
    prompt: string | null
}

export interface Message {
    role: string,
    content: string
}


interface IState {
    username: string
}

interface ILocalState {
}


class State {
    private _state: IState | undefined
    private _username: string
    private _localState: ILocalState
    private _index: GameList[] = []
    private _game_definition: GameDefinition | undefined
    private _gameid: string | undefined

    constructor() {
        this._localState = <ILocalState>{}
        this._username = "laura"
        this.username = localStorage.getItem("username") ?? "laura"
    }

    set username(value: string) {
        this._username = value
        localStorage.setItem("username", value)
        const json = localStorage.getItem(value)
        this._localState = JSON.parse(json ?? "{}")
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

    getMessages () {
        const key = this.getKey("messages")
        const json = localStorage.getItem(key) ?? "[]"
        return JSON.parse(json)as Message[]
    }

    appendUserMessage (content: string, pageno: number) {
        let msgs = this.getMessages()

        // Truncate the message array so we can restart the story in the middle if we want
        msgs = msgs.slice(0, (pageno + 1) * 2)

        msgs.push(<Message>{ role: "user", content })

        const key = this.getKey("messages")
        localStorage.setItem(key, JSON.stringify(msgs))
    }

    appendAssistantMessage (content: string) {
        const msgs = this.getMessages()
        msgs.push(<Message>{ role: "assistant", content })

        const key = this.getKey("messages")
        localStorage.setItem(key, JSON.stringify(msgs))
    }

    async resetMessages () {
        return App.GET(`assets/${this.gameid}.json`)
            .then((payload: any) =>{
                this._game_definition = payload;
            })
            .then(() => {
                this.appendUserMessage(this._game_definition!.prompt!, -1)
                return this._game_definition
            })
    }

    lastPageNo() {
        const msgs = this.getMessages();
        if (msgs == undefined || msgs.length == 0)
            return -1
        return Math.floor((msgs.length - 1) / 2)
    }

    userMessageAtPage (pageno: number) {
        const msgs = this.getMessages();
        return msgs[pageno * 2]?.content
    }

    assistantMessageAtPage (pageno: number) {
        const msgs = this.getMessages();
        return msgs[1 + pageno * 2]?.content
    }



    //
    // Reading content on the server
    //
    async fetch_index () {
        return App.GET("assets/_index.json")
            .then((payload: any) =>{
                this._index = payload;
            })
    }

    async fetch_game_definition (gameid: string) {
        this._gameid = gameid
        return App.GET(`assets/${gameid}.json`)
            .then((payload: any) =>{
                this._game_definition = payload;
                return payload
            })
    }

    new_game_definition () {
        this._game_definition = <GameDefinition> {
            code: "new",
            title: "NEW",
            bg_url: "",
            prompt: "You are an helpful assistant"
        }

        this._gameid = this._game_definition.code!
    }


    //
    // Interacting with ollama
    //
    // OLLAMA_HOST=0.0.0.0:11434 ollama serve
    // or
    // ssh -L 11434:localhost:11434 christian@192.168.50.199
    //
    async executePrompt (user_prompt: string) {
        // Créer le prompt complet à partir de ce qu'il y a dans localStorage + user_prompt
        await waitAsync(1500)
        return "Réponse de ollama au prompt: " + user_prompt
    }
}

export const state = new State();
