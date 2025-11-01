import * as App from "../core/app.js"
import { capitalize } from "../common/utils.js";


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


class State {
    private _username: string
    private _index: GameList[] = []
    private _game_definition: GameDefinition | undefined
    private _gameid: string | undefined
    
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

    set gameid(value: string) {
        this._gameid = value
    }

    get game_definition() {
        return this._game_definition!
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
}


export const state = new State();
