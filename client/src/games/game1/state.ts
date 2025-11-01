import * as App from "../../core/app.js"
import { state as base, GameDefinition } from "../state.js"
export { GameDefinition }


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
    private _game_definition: GameDefinition | undefined
    private _pages: IPage[] = []
    
    private last_StorySoFar_url: string | null = null


    constructor() {
    }

    get usernameCapitalized() {
        return base.usernameCapitalized
    }

    
    //
    // Managing the state
    //
    async fetchStorySoFarAsync (gameid?: string) {
        if (gameid != undefined)
            base.gameid = gameid

        const url = `users/${base.username}/${base.gameid}`

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

        await App.PUT(`users/${base.username}/${base.gameid}`, this._pages)
        return this.fetchStorySoFarAsync()
    }

    async setAssistantMessageAsync (content: string, pageno: number) {
        await this.fetchStorySoFarAsync()

        this._pages[pageno].assistant = content;

        await App.PUT(`users/${base.username}/${base.gameid}`, this._pages)
        return this.fetchStorySoFarAsync()
    }

    async resetMessagesAsync () {
        this._pages = [];
        this._pages.push(<IPage> { user: this._game_definition!.prompt! })

        await App.PUT(`users/${base.username}/${base.gameid}`, this._pages)
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
    async fetchGameDefinitionAsync (gameid: string) {
        return base.fetchGameDefinitionAsync(gameid)
    }



    async chatAsync(streamUpdater?: (message: string) => void) {
        const endpoint = App.apiurl(`chat/${base.gameid}`)
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
        const endpoint = App.apiurl(`chat/${base.gameid}/${extra}`)
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
