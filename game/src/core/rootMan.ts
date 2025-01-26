"use strict"

export class rootMan {
    private roots: string[];
    private dedicated = false;
    private ix = 0;
    private bumpUntil = 0;

    constructor(roots: string[]) {
        this.roots = roots.slice();
        this.dedicated = (roots.length == 1);
    }

    public getDomain = () => {
        if (this.ix != 0 && this.bumpUntil != 0 && new Date().getTime() > this.bumpUntil) {
            this.bumpUntil = 0;
            this.ix = 0;
            //console.log(`trying root domain`);
        }
        return this.roots[this.ix];
    }

    public bump = () => {
        if (this.dedicated)
            return;
        this.ix = (this.ix + 1) % this.roots.length;
        this.bumpUntil = (new Date().getTime()) + (2 * 60 * 1000);
        //console.log(`root bumped to ${this.ix}`)
    }
}
