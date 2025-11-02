import * as App from "../../core/app.js"
import { state as base, GameDefinition } from "../state.js"
export { GameDefinition }

export interface GameState {
    currentid: number
    allows: Map<number, string>
}


class State {
    private _game_state: GameState = { currentid: 0, allows: new Map() }
    private last_StorySoFar_url: string | null = null


    constructor() {
    }

    get usernameCapitalized() {
        return base.usernameCapitalized
    }

    get game_definition() {
        return base.game_definition
    }

    get game_state() {
        return this._game_state
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

                const currentid = (payload as any).currentid;
                const allowsArray: [number, string][] = JSON.parse((payload as any).allowsArray);
                const allows = new Map<number, string>(allowsArray);

                this._game_state = { currentid, allows }
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
        this._game_state = { currentid: 1, allows: new Map()}
        const game_state = {
            currentid: this._game_state.currentid,
            allowsArray: JSON.stringify(Array.from(this._game_state.allows.entries()))
        }
        await App.PUT(`users/${base.username}/${base.gameid}`, game_state)
    }

    async saveGameStateAsync (id: number, allows: Map<number, string>) {
        this._game_state = { currentid: id, allows }
        const game_state = {
            currentid: this._game_state.currentid,
            allowsArray: JSON.stringify(Array.from(this._game_state.allows.entries()))
        }
        await App.PUT(`users/${base.username}/${base.gameid}`, game_state)
    }



    //
    // Operations on the server
    //
    async fetchGameDefinitionAsync (gameid: string) {
        return base.fetchGameDefinitionAsync(gameid)
    }
}


export const state = new State();
