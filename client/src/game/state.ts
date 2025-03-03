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
    llmid: number | null
    llmid_text: string
    extra: string | null
}


export interface IChat {
    role: string
    content: string
}

export interface IPage {
    assistant: string
    user: string
    extra?: IExtra
}

export interface IExtra {
    choices: string[]
    mood: string
}

export interface IChoice {
    description: string
    participants: string[]
}


class State {
    private _username: string
    private _index: GameList[] = []
    private _game_definition: GameDefinition | undefined
    private _gameid: string | undefined
    
    llmid: number | null = null

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

    getPages (gameid?: string) {
        if (gameid != undefined)
            this._gameid = gameid

        const key = this.getKey("pages")
        const json = localStorage.getItem(key) ?? "[]"
        return JSON.parse(json) as IPage[]
    }

    addUserMessage (content: string, pageno: number) {
        let pages = this.getPages()

        // Truncate the page array so we can restart the story in the middle if we want
        pages = pages.slice(0, pageno + 1)
        pages.push(<IPage> { user: content })

        const key = this.getKey("pages")
        localStorage.setItem(key, JSON.stringify(pages))
    }

    setAssistantMessage (content: string, pageno: number) {
        const pages = this.getPages()
        pages[pageno].assistant = content;

        const key = this.getKey("pages")
        localStorage.setItem(key, JSON.stringify(pages))
    }

    resetMessages () {
        this.addUserMessage(this._game_definition!.prompt!, -1)
        return this._game_definition
    }

    lastPageNo() {
        const pages = this.getPages();
        if (pages == undefined || pages.length == 0)
            return -1
        return (pages.length - 1)
    }

    userMessageOnPage (pageno: number): string | null {
        const pages = this.getPages();
        return pages[pageno]?.user
    }

    userMessageOnNextPage (pageno: number) {
        const pages = this.getPages();
        return pages[pageno + 1]?.user
    }

    assistantMessageOnPage (pageno: number) {
        const msgs = this.getPages();
        return msgs[pageno]?.assistant
    }

    pagesToMessages () {
        const pages = this.getPages()
        const messages: IChat[] = []
        pages.forEach((one, index) => {

            messages.push(<IChat> {
                role: (index == 0 ? "system" : "user"),
                content: one.user
            })

            if (one.assistant) {
                messages.push(<IChat> {
                    role: "assistant",
                    content: one.assistant
                })
            }
        })
        return messages
    }



    //
    // Operations on the server
    //
    async fetch_index () {
        this._index = await App.GET("stories") as any
    }

    async fetch_game_definition (gameid: string) {
        if (this._gameid == gameid) {
            return this._game_definition
        }

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

    async save_story(game_definition: any) {
        this._game_definition = game_definition
        return App.PUT(`stories/${this.gameid}`, game_definition)
    }

    async delete_story() {
        const key = this.getKey("messages")
        localStorage.removeItem(key)

        return App.DELETE(`stories/${this.gameid}`, {})
    }

    async chat(streamUpdater?: (message: string) => void) {
        const endpoint = App.apiurl(`stories/${this.gameid}/chat`)
        const messages = this.pagesToMessages()
        
        const response = await window.fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(messages)
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

    async chatExtra(extra: string) {
        const endpoint = App.apiurl(`stories/${this.gameid}/chat-extra/${extra}`)
        const messages = this.pagesToMessages()

        const response = await window.fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(messages)
        })
    
        if (!response.body) {
            throw new Error("No response from LLM endpoint");
        }
    
        return await response.json();
    }
}

export const state = new State();
