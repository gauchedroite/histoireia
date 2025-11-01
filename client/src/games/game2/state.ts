import * as App from "../../core/app.js"
import { state as base, GameDefinition } from "../state.js"
export { GameDefinition }

export interface GameState {
    currentid: number
}


class State {
    private _game_state: GameState = { currentid: 0}
    private last_StorySoFar_url: string | null = null


    constructor() {
    }

    get usernameCapitalized() {
        return base.usernameCapitalized
    }

    get game_definition() {
        return base.game_definition
    }


    //
    // Managing the state
    //
    async fetchGameStateAsync (gameid?: string) {
        if (gameid != undefined)
            base.gameid = gameid

        const url = `users/${base.username}/${base.gameid}`

        if (url != this.last_StorySoFar_url) {
            return App.GET(url)
            .then(payload => {
                this.last_StorySoFar_url = url
                this._game_state = payload as any;
                return this._game_state
            })
        }
        else {
            return Promise
                .resolve()
                .then(_ => {
                    return this._game_state
                })
        }
    }

    async resetGameStateAsync () {
        this._game_state = { currentid: 0}
        await App.PUT(`users/${base.username}/${base.gameid}`, this._game_state)
    }



    //
    // Operations on the server
    //
    async fetchGameDefinitionAsync (gameid: string) {
        return base.fetchGameDefinitionAsync(gameid)
    }
}


export const state = new State();
