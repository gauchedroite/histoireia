// @ts-nocheck

declare const Toastify: any;
declare const i18n: any;



let ESC_MAP = <any>{
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
};
let tolerance = 0.00012; //for lat/lng fields
let serverTimezoneOffset: number; //minutes



const getTimezoneOffset = (timeZone = "UTC") => {
    const date = new Date();
    const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
    const tzDate = new Date(date.toLocaleString("en-US", { timeZone }));
    return (utcDate.getTime() - tzDate.getTime()) / 60000;
}

serverTimezoneOffset = getTimezoneOffset((<any>window).APP.timeZone);



export const reviver = (key: string, value: any) => {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
        let date = new Date(value);
        //const hoursDiff = date.getHours() + serverTimezoneOffset / 60;
        //date.setHours(hoursDiff);
        return date;
    }
    else if (typeof value === "string" && /^\d{2}:\d{2}:\d{2}/.test(value)) {
        return new Date("2000-01-01T" + value);
    }
    return value;
}

export const escapeHTML = (text: string, forAttribute = true) => {
    if (text == undefined)
        return text;

    return text.replace((forAttribute ? /[&<>'"]/g : /[&<>]/g), function (c) { return ESC_MAP[c]; });
}

export function replacer(key: any, value: any) {
    if (this[key] instanceof Date) {
        let date = this[key] as Date;
        //const hoursDiff = date.getHours() - serverTimezoneOffset / 60;
        //date.setHours(hoursDiff);
        //return date.toISOString().slice(0, -1);
        return date.toJSON();
    }
    return value;
}

export const sanitizeAttribute = (title: string) => {
    if (title == undefined)
        return "";
    return title.replace(/"/g, "`").replace(/'/g, "`")
}

export const convertToPlainText = (html: string) => {
    const element = document.createElement("div");
    element.innerHTML = html;

    let plaintext = "";
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node.nodeType === Node.TEXT_NODE)
            plaintext += node.nodeValue;
    }

    return plaintext.trim();
}



export const clone = (state: any, passthrough?: string[]) => {
    let cloned = {};
    Object.keys(state).forEach(key => {
        if (state.hasOwnProperty(key)) {
            if (state[key] == null) {
                cloned[key] = null
            }
            else if (passthrough != undefined && passthrough.indexOf(key) != -1) {
                cloned[key] = state[key];
            }
            else if (typeof state[key].getTime === "function") {
                cloned[key] = new Date(state[key].getTime());
            }
            else if (Array.isArray(state[key])) {
                cloned[key] = [];
                (state[key] as any[]).forEach(one => cloned[key].push(clone(one, passthrough)))
            }
            else if (typeof state[key] == "object") {
                cloned[key] = clone(state[key], passthrough);
            }
            else {
                cloned[key] = state[key];
            }
        }
    });
    if (typeof state == "number" || typeof state == "string")
        return state;
    return cloned;
};

export const same = (state1: any, state2: any, onlyprops: string[] = null) => {
    let isSame = true;
    Object.keys(state1).forEach(key => {
        if (isSame && state1.hasOwnProperty(key) && key.charAt(0) != "_" && (onlyprops == null || onlyprops.indexOf(key) != -1)) {
            let value1 = state1[key];
            let value2 = state2[key];
            let isPrimitiveType = false;
            //console.log(`key=${key} value1=${value1}, value2=${value2}`)

            if (value1 != undefined) {
                if (typeof value1.getTime === "function") {
                    value1 = value1.getTime();
                    isPrimitiveType = true;
                }
                else if (Array.isArray(value1)) {
                    for (let ix = 0; ix < value1.length; ix++) {
                        isSame = isSame && value2 && same(value1[ix], value2[ix], onlyprops);
                        if (!isSame)
                            return false;
                    }
                }
                else if (typeof value1 === "object") {
                    isSame = isSame && value2 && same(value1, value2, onlyprops);
                }
                else {
                    isPrimitiveType = true;
                }
            }

            if (value2 != undefined) {
                if (typeof value2.getTime === "function") {
                    value2 = value2.getTime();
                    isPrimitiveType = true;
                }
                else if (Array.isArray(value2)) {
                    for (let ix = 0; ix < value2.length; ix++) {
                        isSame = isSame && value1 && same(value2[ix], value1[ix], onlyprops);
                        if (!isSame)
                            return false;
                    }
                }
                else if (typeof value2 === "object") {
                    isSame = isSame && value1 && same(value2, value1, onlyprops);
                }
                else {
                    isPrimitiveType = true;
                }
            }

            if (isPrimitiveType) {
                if (key == "latitude" || key == "longitude" || key == "longitude_abs") {
                    if (Math.abs(value1 - value2) > tolerance)
                        isSame = false;
                }
                else if (value1 !== value2) {
                    console.log(`*****NOT SAME ${key}`)
                    isSame = false;
                }
            }

            if (!isSame)
                return false;
        }
    });
    return isSame;
};

export const changes = (state1: any, state2: any) => {
    let names: string[] = [];
    Object.keys(state1).forEach(key => {
        if (key != "summary" && key != "perm") {
            let value1 = state1[key];
            let value2 = state2[key];
            if (value1 != null && typeof value1.getTime === "function")
                value1 = value1.getTime();
            if (value2 != null && typeof value2.getTime === "function")
                value2 = value2.getTime();

            if (value1 != null && Array.isArray(value1) && value2 != null && Array.isArray(value2)) {
                let wrong = JSON.stringify(value1) != JSON.stringify(value2);
                if (wrong)
                    if (wrong) {
                        let translated = i18n(key.toUpperCase());
                        names.push(translated);
                        console.log(`${key}[${translated}] BEFORE=${JSON.stringify(value1)}, AFTER=${JSON.stringify(value2)}`);
                    }
            }
            else if (value1 !== value2) {
                let wrong = true;
                if ((key == "latitude" || key == "longitude" || key == "longitude_abs") && Math.abs(value1 - value2) < tolerance)
                    wrong = false;
                if (wrong) {
                    let translated = i18n(key.toUpperCase());
                    names.push(translated);
                    console.log(`${key}[${translated}] BEFORE=${state1[key]}, AFTER=${state2[key]}`);
                }
            }
        }
    });
    if (names.length == 0)
        return null;
    return `Fields: [${names.join(", ")}]`;
};



export const html5Valid = (ns: string): boolean => {
    document.getElementById(`${ns}_dummy_submit`).click();
    let form = document.getElementsByTagName("form")[0];
    form.classList.add("js-error");
    if (html5HasInvalids(ns)) return false;
    return form.checkValidity();
};

export const html5HasInvalids = (ns: string): boolean => {
    document.getElementById(`${ns}_dummy_submit`).click();
    let form = document.getElementsByTagName("form")[0];
    let invalids = form.querySelectorAll(".js-invalid");
    if (invalids.length == 0) return false
    invalids.forEach((one: HTMLInputElement) => one.setCustomValidity("This value is invalid"))
    return true;
};

export const html5Invalid = (id: string): boolean => {
    let element = document.getElementById(id);
    if (element == undefined) return false;
    let invalid = element.classList.contains("js-invalid");
    return (invalid != undefined);
};




export const toInputText = (value: any) => {
    return (value == undefined ? "" : escapeHTML(value.toString()));
};

export const fromInputText = (id: string, defValue: string = null) => {
    let element = <HTMLInputElement>document.getElementById(id);
    return (element == undefined ? defValue : element.value == "" ? null : element.value);
};




export const fromInputNumber = (id: string, defValue: number = null) => {
    let element = <HTMLInputElement>document.getElementById(id);

    if (element == undefined)
        return defValue;

    if (element.dataset["money"] != undefined) {
        if (element.dataset.nozero != undefined)
            return (element.value == "" ? 0 : +parseFloat(element.value).toFixed(2));

        return (element.value == "" ? null : +parseFloat(element.value).toFixed(2));
    }
    else {
        if (element.dataset.nozero != undefined)
            return (element.value == "" ? 0 : +parseFloat(element.value).toFixed(2));

        return (element.value == "" ? null : +parseFloat(element.value).toFixed(2));
    }
};




export const fromSelectNumber = (id: string, defValue: number = null) => {
    let select = <HTMLSelectElement>document.getElementById(id);
    if (select == undefined || select.selectedIndex == -1)
        return defValue;
    let value = select.options[select.selectedIndex].value;
    return (value.length > 0 ? +value : null);
};

export const fromSelectText = (id: string, defValue: string = null) => {
    let select = <HTMLSelectElement>document.getElementById(id);
    if (select == undefined || select.selectedIndex == -1)
        return defValue;
    let value = select.options[select.selectedIndex].value;
    return (value.length > 0 ? value : null);
};

export const fromSelectBoolean = (id: string, defValue: boolean = null) => {
    let select = <HTMLSelectElement>document.getElementById(id);
    if (select == undefined || select.selectedIndex == -1)
        return defValue;
    let value = select.options[select.selectedIndex].value;
    return (value.length > 0 ? (value == "true") : null);
};




export const toInputDate = (value: Date) => {
    if (value == undefined || value.toString().toLowerCase() == "invalid date")
        return "";
    return formatYYYYMMDD(value, "-");
};

export const toInputTimeHHMM = (date: Date, separator = ":", over24 = 0) => {
    if (date == undefined)
        return "";

    var hours = date.getHours() + (over24 * 24);
    var minutes = date.getMinutes();
    return `${hours < 10 ? "0" + hours : hours}${separator}${minutes < 10 ? "0" + minutes : minutes}`;
};

export const toInputTimeHHMMSS = (date: Date) => {
    if (date == undefined)
        return "";

    var hours = date.getHours();
    var minutes = date.getMinutes();
    let secs = date.getSeconds();
    return `${hours < 10 ? "0" + hours : hours}:${minutes < 10 ? "0" + minutes : minutes}:${secs < 10 ? "0" + secs : secs}`;
};

export const toInputDateTime_hhmmssNA = (date: Date) => {
    if (date == undefined)
        return "n/a";

    var hours = date.getHours();
    var minutes = date.getMinutes();
    var seconds = date.getSeconds();
    var ampm = (hours < 12 ? "AM" : "PM");
    hours = hours % 12;
    hours = (hours ? hours : 12);
    let time = `${hours < 10 ? "0" + hours : hours}:${minutes < 10 ? "0" + minutes : minutes}:${seconds < 10 ? "0" + seconds : seconds} ${ampm}`;
    return `${toInputDate(date)}&nbsp;${time}`;
};

export const fromInputDate = (id: string, defValue: Date = null) => {
    let element = <HTMLInputElement>document.getElementById(id);
    if (element == undefined)
        return defValue;
    var parts = element.value.split("-");

    if (defValue == null)
        return new Date(+parts[0], +parts[1] - 1, +parts[2], 0, 0, 0, 0);

    try {
        let date = new Date(defValue.getTime());
        date.setFullYear(+parts[0], +parts[1] - 1, +parts[2]);
        return date;
    }
    catch (error) {
        return null;
    }
};

export const parseDateText = (value: string) => {
    try {
        var parts = value.split("-");
        let date = new Date();
        date.setFullYear(+parts[0], +parts[1] - 1, +parts[2]);
        date.setHours(0, 0, 0, 0);
        return date;
    }
    catch (error) {
        return null;
    }
};

export const elapsedTime = (msec: number) => {
    let minutes = msec / (60 * 1000);
    let date = new Date();
    date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    return date;
}




export const fromInputCheckbox = (id: string, defValue: boolean = null) => {
    let element = <HTMLInputElement>document.getElementById(id);
    return (element == undefined ? defValue : element.checked);
};

export const fromInputCheckboxMask = (name: string, defValue: number = null) => {
    let elements = document.getElementsByName(name);
    if (elements == undefined || elements.length == 0)
        return defValue;
    let value = 0;
    for (let ix = 0; ix < elements.length; ix++) {
        let element = <HTMLInputElement>elements[ix];
        value += (element.checked ? +element.dataset.mask : 0);
    }
    return value;
};

interface ICheckbox {
    id: number
    description: string
    selected: boolean
    xref: number
}

export const fromInputCheckboxList = (name: string, list: ICheckbox[]) => {
    if (list == undefined)
        return null;

    list.forEach(one => one.selected = fromInputCheckbox(`${name}_${one.id}`, one.selected))
    return list;
}




export const toStaticText = (value: any) => {
    return (value == undefined ? "" : value);
};

export const toStaticTextarea = (value: string) => {
    return (value == undefined ? "" : value.replace(/\n/g, "<br>"));
};

export const toStaticTextNA = (value: string) => {
    return (value == undefined ? "n/a" : value.replace(/\n/g, "<br>"));
};

export const toStaticNumber = (value: number) => {
    return (value == undefined ? "" : value.toString());
};

export const toStaticNumberNA = (value: number) => {
    return (value == undefined ? "n/a" : value.toString());
};

export const toStaticNumberNZ = (value: number) => {
    return (value == undefined || value == 0 ? "" : value.toString());
};

export const toStaticNumberDecimal = (value: number, places = 2, forced = true, nozero = false, nonumber = false) => {
    if (value == undefined || nonumber)
        return "";

    if (nozero && value == 0)
        return "";

    let scale = Math.pow(10, places);
    if (forced)
        return (Math.round(value * scale) / scale).toFixed(places);
    else
        return (Math.round(value * scale) / scale).toString();
};

export const toStaticNumberDecimalNZ = (value: number, places = 2, forced = true) => {
    if (value == undefined || value == 0)
        return "";

    return toStaticNumberDecimal(value, places, forced)
};

export const toStaticMoney = (value: number) => {
    let formatter = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });
    return formatter.format(value ?? 0);
};

export const toStaticDateTime = (date: Date) => {
    //return (date != undefined ? date.toLocaleString() : "");

    if (date == undefined)
        return "";
    return `${formatYYYYMMDD(date, "-")} ${formatHHMMSS24(date)}`;
};

export const toStaticCheckboxYesNo = (value: boolean) => {
    return (value == undefined ? "n/a" : value ? "yes" : "no");
}




export const formatYYYYMMDD = (date: Date, separator = "/") => {
    if (date == undefined)
        return "";
    let month = "" + (date.getMonth() + 1);
    let day = "" + date.getDate();
    let year = date.getFullYear();

    if (month.length < 2) month = "0" + month;
    if (day.length < 2) day = "0" + day;

    return [year, month, day].join(separator);
};

export const formatHHMMSS24 = (date: Date) => {
    if (date == undefined)
        return "";
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var seconds = date.getSeconds();
    return `${hours < 10 ? "0" + hours : hours}:${minutes < 10 ? "0" + minutes : minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
};

export const toInputDateTime_hhmm24 = (date: Date) => {
    if (date == undefined)
        return "";
    var hours = date.getHours();
    var minutes = date.getMinutes();
    let time = `${hours < 10 ? "0" + hours : hours}:${minutes < 10 ? "0" + minutes : minutes}`;

    return `${toInputDate(date)} ${time}`;
};

export const toInputDateTime_hhmmss24 = (date: Date) => {
    if (date == undefined)
        return "";
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var seconds = date.getSeconds();
    let time = `${hours < 10 ? "0" + hours : hours}:${minutes < 10 ? "0" + minutes : minutes}:${seconds < 10 ? "0" + seconds : seconds}`;

    return `${toInputDate(date)} ${time}`;
};

export const toLocaleDate = (date: Date, options = <Intl.DateTimeFormatOptions>{ weekday: "long", year: "numeric", month: "long", day: "numeric" } ) => {
    return date.toLocaleDateString("en-CA", options);
}

export const isValidDateString = (dateString: string) => {
    if (!dateString.match(/^\d{4}-\d{2}-\d{2}$/))
        return false;
    var date = new Date(dateString);
    var time = date.getTime();
    if (!time && time != 0)
        return false;
    return date.toISOString().slice(0, 10) == dateString;
}

export const isValidTimeString = (timeString: string, max = "2359", min = "0000") => {
    let regs = timeString.match(/^(\d{1,2}):(\d{2})([ap]m)?$/);
    if (!regs)
        return false;

    let timeNumber = +`${regs[1]}${regs[2]}`

    if (timeNumber > +max)
        return false;

    if (timeNumber < +min)
        return false;

    return true;
}

export const dateInRange = (date: Date, rangeStart: Date, rangeEnd: Date) => {
    if (date == undefined || (rangeStart == undefined && rangeEnd == undefined))
        return false;

    let time = date.getTime();
    let timeStart = (rangeStart?.getTime() ?? 0);
    let timeEnd = (rangeEnd?.getTime() ?? Number.MAX_SAFE_INTEGER);

    return (time >= timeStart && time < timeEnd)
}




export const formatBytes = (bytes: number, decimals = 1) => {
    if (bytes == undefined) return "";
    if (bytes == 0) return "0 Bytes";

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export const formatLocaleNumber = (value: number) => {
    if (value == undefined)
        return "";

    return value.toLocaleString()
}

export const getSize = (bytes: number, unit = "GB", decimals = 1) => {
    if (bytes == 0) return "0 Bytes";

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

    const i = sizes.indexOf(unit);

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm));
}

export const filesizeText = (filesize: number) => {
    if (filesize == 0)
        return "";

    var i = -1;
    var byteUnits = [' kB', ' MB', ' GB', ' TB', 'PB', 'EB', 'ZB', 'YB'];
    do {
        filesize = filesize / 1024;
        i++;
    } while (filesize > 1024);

    return Math.max(filesize, 0.1).toFixed(1) + byteUnits[i];
};




export const isValidCreditCard = (cardnumber: number, cardname: string) => {
    let cards: { name: string, lengths: number[], prefixes?: string[], checksum?: boolean }[] = [];
    cards[0] = { name: "Visa", lengths: [13,16], prefixes: ["4"], checksum: true };
    cards[1] = { name: "Fleet", lengths: [16], prefixes: ["6"] };
    cards[2] = { name: "MasterCard", lengths: [16], prefixes: ["51","52","53","54","55"], checksum: true };

    let card = cards.find(one => one.name.toLowerCase() == cardname.toLowerCase());
    if (card == null)
        return false;

    let cardno = cardnumber.toString();
    let checksum = 0;
    let one_two = 1;

    // Check for valid modulus 10
    var calc;
    for (let i = cardno.length - 1; i >= 0; i--) {
        calc = Number(cardno.charAt(i)) * one_two;

        if (calc > 9) {
            checksum = checksum + 1;
            calc = calc - 10;
        }

        checksum = checksum + calc;
        if (one_two == 1) { one_two = 2 } else { one_two = 1 };
    }

    // If checksum is divisible by 10, it is a valid modulus 10
    if ((card.checksum ?? false) && (checksum % 10 != 0))
        return false;

    // Validate card prefixes
    if (card.prefixes != undefined && !card.prefixes.reduce((acc, one) => acc || cardno.startsWith(one), false))
        return false;

    // Validate card lengths
    if (!card.lengths.reduce((acc, one) => acc || cardno.length == one, false))
        return false;

    return true;
}




export const toastSuccess = (text: string) => {
    let div = document.createElement("div");
    div.classList.add("js-toast");
    div.style.display = "none";
    document.body.appendChild(div);
    let style = getComputedStyle(div);
    let bgcolor = style.backgroundColor;
    div.parentNode.removeChild(div);

    Toastify({
        text: text,
        className: "js-toast",
        backgroundColor: bgcolor,
        position: "center",
    }).showToast();
}

export const toastSuccessSave = () => {
    toastSuccess(i18n("Data was saved successfully"));
}

export const toastSuccessUpload = (filename = "File") => {
    toastSuccess(i18n(`${filename} was uploaded successfully`));
}

export const toastFailure = (text = "Your last action failed to execute", duration = 15000) => {
    let div = document.createElement("div");
    div.classList.add("js-toast-bad");
    div.style.display = "none";
    document.body.appendChild(div);
    let style = getComputedStyle(div);
    let bgcolor = style.backgroundColor;
    div.parentNode.removeChild(div);

    Toastify({
        text: text,
        className: "js-toast-bad",
        backgroundColor: bgcolor,
        position: "center",
        gravity: "top",
        duration: duration,
        close: true
    }).showToast();
}




export const createWhite = (formState, props: string[]) => {
    return props.reduce((acc, key) => { { acc[key] = formState[key]; return acc; }; }, {})
}

export const createBlack = (formState, props: string[]) => {
    var cloned = clone(formState)
    props.forEach(prop => delete cloned[prop])
    return cloned;
}



export const parseInputId = (ns: string, input_id: string) => {
    let clean = input_id.replace(`${ns}_`, "");
    let ix = clean.lastIndexOf("_");
    let field = clean.substring(0, ix);
    let id = +clean.substring(ix + 1);
    return [field, id];
}



export const formatTitle = (name: string, summary: any) => {
    if (summary?.title)
        return `${summary?.title}`;

    return `New ${name}`;
}
