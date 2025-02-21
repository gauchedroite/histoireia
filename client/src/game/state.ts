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

    userMessageOnPage (pageno: number) {
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
        this._index = await App.GET("stories") as any

        this._game_definition = await App.GET(`story/${gameid}/metadata.json`) as any

        const response2 = await window.fetch(`story/${gameid}/prompt.txt`)
        const prompt = await response2.text()

        this._gameid = gameid
        this._game_definition!.prompt = prompt
        return this._game_definition
    }

    new_story () {
        this._game_definition = <GameDefinition> {
            code: "new",
            title: "Nouveau!",
            bg_url: "",
            prompt: "You are an helpful assistant"
        }

        this._gameid = this._game_definition.code!
    }

    async save_story(newstate: any) {
        return App.PUT(`stories/${this.gameid}`, newstate)
    }

    async delete_story() {
        //const key = this.getKey("messages")
        //localStorage.removeItem(key)

        return App.DELETE(`stories/${this.gameid}`, {})
    }


    //
    // Interacting with the LLM endpoints
    //
    async executePrompt(user_prompt: string, streamUpdater?: (message: string) => void) {

        // Créer le prompt complet à partir de ce qu'il y a dans localStorage + user_prompt
        const messages = this.getMessages()
        messages.push(<Message>{
            role: "user",
            content: user_prompt            
        })
    
        const endpoint = "https://lebaudy.gauchedroite.com/histoireia/ollama/api/chat"
        const query = {
            model: "lstep/neuraldaredevil-8b-abliterated:q8_0",
            messages,
            stream: true
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
        let buffer = "";  // For incomplete JSON fragments
    
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
    
            buffer += decoder.decode(value, { stream: true });
    
            try {
                const jsonObjects = buffer.split("\n").filter(line => line.trim() !== "");
                buffer = "";
    
                for (const jsonObject of jsonObjects) {
                    try {
                        const chunk = JSON.parse(jsonObject);
                        if (!chunk.done) {
                            answer += chunk.message.content;
                            if (streamUpdater) streamUpdater(chunk.message.content);
                        }
                    } catch (err) {
                        buffer = jsonObject;
                    }
                }
            } catch (err) {
                console.error("Err parsing JSON object in chat response stream", err);
            }
        }
    
        return answer;
    }
}

export const state = new State();
