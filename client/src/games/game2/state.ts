import * as App from "../../core/app.js"
import { state as base, GameDefinition } from "../state.js"
export { GameDefinition }


class State {
/**/private _pages: any[] = []
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

    async resetMessagesAsync () {
        this._pages = [];
        this._pages.push(<any> { user: base.game_definition!.prompt! })

        await App.PUT(`users/${base.username}/${base.gameid}`, this._pages)
        return this.fetchStorySoFarAsync()
    }



    //
    // Operations on the server
    //
    async fetchGameDefinitionAsync (gameid: string) {
        return base.fetchGameDefinitionAsync(gameid)
    }
}


export const state = new State();
