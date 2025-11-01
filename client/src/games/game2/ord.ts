// --- INTERFACES ---
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

// --- GAME CLASS ---
class Game {
    situations: ISituation[] = [];
    situationsById: Map<number, ISituation> = new Map();
    groupSizes: Map<number, number> = new Map();
    originalAllow: Map<number, string> = new Map();
    groupSituationCount: number = 0;
    currentGroup: number = 0;

    // --- LOADING ---
    async Initialize(dataUrl: string, groupSizesData: IGroupSize[]): Promise<void> {
        for (const gs of groupSizesData) this.groupSizes.set(gs.group, gs.size);
        const resp = await fetch(dataUrl);
        const raw = await resp.text();
        this.parseSituations(raw);
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
    GetSituation(id: number): {id: number, title: string, choices: {choice: string}[]} {
        const s = this.situationsById.get(id);
        if (!s) throw "Situation not found";
        this.currentGroup = s.gid;
        return { id: s.id, title: s.title, choices: s.choices.map(c => ({choice: c.choice})) }
    }
    GetConsequence(id: number, choiceid: number) {
        const s = this.situationsById.get(id)!;
        const c = s.choices[choiceid];
        return {
            title: s.title,
            choice: c.choice,
            consequence: c.consequence,
            nextid: c.nextid
        }
    }
    NextSituation(id: number, choiceid: number): {newid: number, end: boolean} {
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
        // Reset allow if nextid==0 or 1
        if (c.nextid === 0 || c.nextid === 1) {
            for (const [id, s0] of this.situationsById) s0.allow = s0.origAllow ?? "";
            this.groupSituationCount = 0;
        }

        let nextid: number | undefined;
        let isEnd = false;

        if (typeof c.nextid === "number" && c.nextid > 1) {
            nextid = c.nextid;
            if (!groupChanged) this.groupSituationCount++;
        } else if (typeof c.nextid === "number" && (c.nextid === 0 || c.nextid === 1)) {
            isEnd = true;
            return {newid: 0, end: isEnd};
        } else {
            if (!groupChanged) this.groupSituationCount++;
            // group limit?
            const size = this.groupSizes.get(this.currentGroup);
            if (size !== undefined && this.groupSituationCount >= size) {
                const exitSit = this.situations.find(s=>s.gid===this.currentGroup && s.allow==="EXIT");
                if (exitSit) return {newid: exitSit.id, end: false};
            }
            // random situation in group, allow = yes
            const possible = this.situations.filter(s => s.gid === this.currentGroup && s.allow === "yes");
            if (possible.length === 0) return {newid: 0, end: true};
            nextid = possible[Math.floor(Math.random() * possible.length)].id;
        }

        return {newid: nextid!, end: isEnd};
    }
}


// --- UI LOGIC ---
const groupSizesData: IGroupSize[] = [
    {group: 1, size: 2},
    {group: 2, size: 5},
    {group: 4, size: 4},
    {group: 5, size: 4},
    {group: 6, size: 3}
];

async function main() {
    const url = `http://localhost:45145/dev-gd/story-ord/game_table.tsv`;
    const game = new Game();
    await game.Initialize(url, groupSizesData);

    // Start from id == 1
    let situationId = 1;

    renderSituation(situationId);

    function renderSituation(id: number) {
        const s = game.GetSituation(id);
        const app = document.getElementById('app')!;

        // Render choices as h3 elements
        const choiceHtml = [0, 1].map(i => {
            const text = s.choices[i].choice;
            return `<h3 id="choice${i}" style="cursor:pointer;margin:0.5em 0">${text}</h3>`;
        }).join('');

        app.innerHTML = `<h2>${s.title}</h2>${choiceHtml}<p id="conseq"></p>`;

        for (let i = 0; i < 2; ++i) {
            const el = document.getElementById(`choice${i}`) as HTMLElement | null;
            if (!el) continue;
            // skip if this choice doesn't exist
            if (!s.choices[i]) {
                el.style.display = 'none';
                continue;
            }
            el.onclick = () => {
                const res = game.GetConsequence(id, i);
                (document.getElementById("conseq") as HTMLParagraphElement).innerText = res.consequence;
                setTimeout(() => {
                    const { newid, end } = game.NextSituation(id, i);
                    if (end || !newid) {
                        app.innerHTML = "<h2>THE END</h2><button id='restart'>Restart</button>";
                        document.getElementById('restart')!.onclick = () => window.location.reload();
                        return;
                    }
                    renderSituation(newid);
                }, 1000);
            };
        }
    }
}

//main();
