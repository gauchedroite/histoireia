import * as App from "../../core/app.js"
import { waitAsync, capitalize } from "../../common/utils.js";


export interface GameList {
    code: string
    title: string
    promptfile: string
    kind_id: number
    kind_fa: string
}

export interface GameDefinition {
    code: string | null
    title: string | null
    bg_url: string | null
    bg_image: string | null
    prompt: string | null
    llmid: number | null
    llmid_text: string
    kindid: number | null
    kindid_text: string
    extra: string | null
    author: string
    justme: boolean
    hasJsonSchema: boolean
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
    private _pages: IPage[] = []
    
    private last_StorySoFar_url: string | null = null
    private last_Index_url: string | null = null


    constructor() {
        this._username = ""
        this.username = localStorage.getItem("username") ?? ""
    }

    set username(value: string) {
        this._username = value.toLowerCase()
        localStorage.setItem("username", this._username)
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
    // Managing the state
    //
    async fetchStorySoFarAsync (gameid?: string) {
        if (gameid != undefined)
            this._gameid = gameid

        const url = `users/${this.username}/${this.gameid}`

        if (url != this.last_StorySoFar_url) {
            return App.GET(url)
            .then(payload => {
                this.last_StorySoFar_url = url
                this._pages = payload as any;
                return this._pages
            })
        }
        else {
            return Promise
                .resolve()
                .then(_ => {
                    return this._pages
                })
        }
    }

    async addUserMessageAsync (content: string, pageno: number) {
        await this.fetchStorySoFarAsync()

        // Truncate the page array so we can restart the story in the middle if we want to
        this._pages = this._pages.slice(0, pageno + 1)
        this._pages.push(<IPage> { user: content })

        await App.PUT(`users/${this.username}/${this.gameid}`, this._pages)
        return this.fetchStorySoFarAsync()
    }

    async setAssistantMessageAsync (content: string, pageno: number) {
        await this.fetchStorySoFarAsync()

        this._pages[pageno].assistant = content;

        await App.PUT(`users/${this.username}/${this.gameid}`, this._pages)
        return this.fetchStorySoFarAsync()
    }

    async resetMessagesAsync () {
        this._pages = [];
        this._pages.push(<IPage> { user: this._game_definition!.prompt! })

        await App.PUT(`users/${this.username}/${this.gameid}`, this._pages)
        return this.fetchStorySoFarAsync()
    }

    pages() {
        return this._pages;
    }

    lastPageNo() {
        if (this._pages == undefined || this._pages.length == 0)
            return -1
        
        return (this._pages.length - 1)
    }

    userMessageOnPage (pageno: number) {
        return this._pages[pageno]?.user
    }

    userMessageOnNextPage (pageno: number) {
        return this._pages[pageno + 1]?.user
    }

    assistantMessageOnPage (pageno: number) {
        return this._pages[pageno]?.assistant
    }

    pagesToMessages () {
        const messages: IChat[] = []
        this._pages.forEach((one, index) => {

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
    async fetchIndexAsync () {
        const url = `stories-for/${this.username}`

        if (this.last_Index_url != url) {
            this.last_Index_url = url
            this._index = await App.GET(url) as any
        }
    }

    async fetchGameDefinitionAsync (gameid: string) {
        if (this._gameid == gameid) {
            return this._game_definition
        }

        this._gameid = gameid
        this._game_definition = await App.GET(`stories/${gameid}`) as unknown as GameDefinition
        return this._game_definition
    }

    newStory () {
        this._game_definition = <GameDefinition> {
            code: "new",
            title: "Nouveau!",
            bg_image: "",
            prompt: "Tu es un assistant utile.",
            author: this.username,
            justme: true,
            extra: null
        }

        this._gameid = this._game_definition.code!
    }

    async saveStoryAsync(game_definition: any) {
        this.last_Index_url = null
        this._game_definition = game_definition
        return App.PUT(`stories/${this.gameid}`, game_definition)
    }

    async deleteStoryAsync() {
        this.last_Index_url = null
        return App.DELETE(`stories/${this.gameid}`, {})
    }



    async chatAsync(streamUpdater?: (message: string) => void) {
        const endpoint = App.apiurl(`chat/${this.gameid}`)
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

    async chatExtraAsync(extra: string) {
        const endpoint = App.apiurl(`chat/${this.gameid}/${extra}`)
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
