import { isObjectEmpty } from "../utils.js";


export default class UserData {

    constructor (public gameid: string) {
    }


    //
    // state
    //
    get state() : any {
        const _state_ = JSON.parse(this.localStorage_getItem("state") ?? "{}");
        return isObjectEmpty(_state_) ? null : _state_
    }

    set state(full_state: any) {
        this.localStorage_setItem("state", JSON.stringify(full_state));
    }

    clearState = () => {
        this.localStorage_removeItem("state");
    }


    //
    // localStorage get/set/remove
    //
    localStorage_getItem(key: string) {
        return localStorage.getItem(`${this.gameid}_${key}`)
    }

    localStorage_setItem(key: string, json: string) {
        localStorage.setItem(`${this.gameid}_${key}`, json);
    }

    localStorage_removeItem(key: string) {
        localStorage.removeItem(`${this.gameid}_${key}`);
    }


    //
    // game file persistence
    //
    fetchGameFileAsync = async () => {
        const savedjson = this.localStorage_getItem("_game")
        if (savedjson) {
            return savedjson
        }

        const url = this.doc("game-script.json")
        try {
            const response = await fetch(url)
            const text = await response.text()
            this.localStorage_setItem("_game", text)
            return text
        }
        catch (ex) {
            return ""
        }
    }

    private doc = (assetName: string) => {
        return `/tellergame-${this.gameid}/${assetName}`
    }
}
