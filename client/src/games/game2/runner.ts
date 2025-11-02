// --- INTERFACES ---
export interface ISituationUI {
    id: number
    title: string
    choices: {choice: string}[]
}
export interface IConsequenceUI {
    id: number
    title: string
    choice: string
    consequence: string
    nextid: number
    end: boolean
    gameover: boolean
}

interface ISituation {
    id: number;
    gid: number;
    allow: string;
    title: string;
    choices: IChoice[];
    origAllow?: string; // to support allow reset
}
interface IChoice {
    choice: string;
    consequence: string;
    nextgid?: number;
    nextid?: number;
    changeallow?: number[];
}
interface IGroupSize {
    group: number;
    size: number;
}

// --- GAME RUNNER CLASS ---
class Runner {
    situations: ISituation[] = [];
    situationsById: Map<number, ISituation> = new Map();
    groupSizes: Map<number, number> = new Map();
    originalAllow: Map<number, string> = new Map();
    groupSituationCount: number = 0;
    currentGroup: number = 0;

    // --- LOADING ---
    Initialize(tsv: string) {
        const groupSizesData: IGroupSize[] = [
            {group: 1, size: 2},
            {group: 2, size: 5},
            {group: 4, size: 4},
            {group: 5, size: 4},
            {group: 6, size: 3}
        ];
        
        this.situations = [];
        this.situationsById = new Map();
        this.groupSizes = new Map();
        this.originalAllow = new Map();
        this.groupSituationCount = 0;
        this.currentGroup = 0;

        for (const gs of groupSizesData) this.groupSizes.set(gs.group, gs.size);

        this.parseSituations(tsv);
    }

    parseSituations(raw: string) {
        // Parse TSV
        const lines = raw.trim().split(/\r?\n/);
        for (let i = 1; i < lines.length; ++i) {
            if (!lines[i].trim()) continue;
            const row = lines[i].split('\t');
            const id = parseInt(row[0]);
            const gid = parseInt(row[1]);
            const allow = row[2];
            const title = row[3];
            let choices: IChoice[] = [];
            for (let j = 0; j < 2; ++j) {
                const base = 4 + j * 5;
                if (row.length <= base) break;
                const choice = row[base];
                if (!choice) continue;
                const consequence = row[base + 1];
                const nextgid = row[base + 2] ? parseInt(row[base + 2]) : undefined;
                const nextid = row[base + 3] ? parseInt(row[base + 3]) : undefined;
                let changeallow: number[] | undefined;
                const caStr = row[base + 4];
                if (caStr) {
                    try {
                        if (caStr.trim().startsWith("[")) {
                            changeallow = JSON.parse(caStr.replace(/'/g,'"'));
                        } else {
                            const v = caStr.replace(/[\[\]]/g,'').split(',').map(e=>parseInt(e)).filter(x=>!isNaN(x));
                            if (v.length) changeallow = v;
                        }
                    } catch { /* ignore error */ }
                }
                choices.push({ choice, consequence, nextgid, nextid, changeallow });
            }
            const sit: ISituation = { id, gid, allow, title, choices, origAllow: allow };
            this.situations.push(sit);
            this.situationsById.set(id, sit);
            this.originalAllow.set(id, allow);
            if (i === 1) this.currentGroup = gid;
        }
    }

    // --- API ---
    GetSituation(id: number): ISituationUI {
        const s = this.situationsById.get(id);
        if (!s) throw "Situation not found";
        this.currentGroup = s.gid;
        return <ISituationUI>{ id: s.id, title: s.title, choices: s.choices.map(c => ({choice: c.choice})) }
    }
    GetConsequence(id: number, choiceid: number) : IConsequenceUI {
        const s = this.situationsById.get(id)!;
        const c = s.choices[choiceid];
        return <IConsequenceUI>{
            id,
            title: s.title,
            choice: c.choice,
            consequence: c.consequence,
            nextid: c.nextid!,
            end: (c.nextid == undefined ? false : c.nextid == 1),
            gameover: (c.nextid == undefined ? false : c.nextid == 0)
        }
    }
    NextSituation(id: number, choiceid: number) {
        const s = this.situationsById.get(id)!;
        const c = s.choices[choiceid];

        // Group change?
        let groupChanged = false;
        if (c.nextgid && !isNaN(c.nextgid)) {
            this.currentGroup = c.nextgid;
            this.groupSituationCount = 0;
            groupChanged = true;
        }

        // Change allow
        if (c.changeallow && c.changeallow.length) {
            for (const idx of c.changeallow) {
                const sid = Math.abs(idx);
                const sit = this.situationsById.get(sid);
                if (sit) sit.allow = idx > 0 ? "yes" : "";
            }
        }
        // Reset allow and exit if nextid==0 or 1
        if (c.nextid === 0 || c.nextid === 1) {
            for (const [id, s0] of this.situationsById) s0.allow = s0.origAllow ?? "";
            this.groupSituationCount = 0;
            return 1;
        }

        let nextid: number | undefined;

        if (typeof c.nextid === "number" && c.nextid > 1) {
            nextid = c.nextid;
            if (!groupChanged) this.groupSituationCount++;
        } else {
            if (!groupChanged) this.groupSituationCount++;
            // group limit?
            const size = this.groupSizes.get(this.currentGroup);
            if (size !== undefined && this.groupSituationCount >= size) {
                const exitSit = this.situations.find(s=>s.gid===this.currentGroup && s.allow==="EXIT");
                if (exitSit) return exitSit.id;
            }
            // random situation in group, allow = yes
            const possible = this.situations.filter(s => s.gid === this.currentGroup && s.allow === "yes");
            if (possible.length === 0) return 0;
            nextid = possible[Math.floor(Math.random() * possible.length)].id;
        }

        return nextid!;
    }
    ClearState() {
        for (const [id, s0] of this.situationsById) s0.allow = s0.origAllow ?? "";
    }
    GetState() {
        return new Map(Array.from(this.situationsById, ([key, situation]) => [key, situation.allow]));
    }
    SetState(state: Map<number, string>) {
        for (const [key, allowValue] of state) {
            const situation = this.situationsById.get(key);
            if (situation) {
                situation.allow = allowValue;
            }
        }
    }
}


export const runner = new Runner();
