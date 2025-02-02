"use strict";
export class rootMan {
    constructor(roots) {
        this.dedicated = false;
        this.notspecified = true;
        this.ix = 0;
        this.bumpUntil = 0;
        this.getDomain = () => {
            if (this.ix != 0 && this.bumpUntil != 0 && new Date().getTime() > this.bumpUntil) {
                this.bumpUntil = 0;
                this.ix = 0;
            }
            if (this.notspecified)
                return "";
            return this.roots[this.ix];
        };
        this.bump = () => {
            if (this.dedicated)
                return;
            this.ix = (this.ix + 1) % this.roots.length;
            this.bumpUntil = (new Date().getTime()) + (2 * 60 * 1000);
        };
        this.roots = roots.slice();
        this.notspecified = roots.length == 0;
        this.dedicated = (roots.length == 1) || this.notspecified;
    }
}
