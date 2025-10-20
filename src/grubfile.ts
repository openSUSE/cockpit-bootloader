/**
 * @class
 * @prop {number} line
 * @prop {string} key
 * @prop {string} value
 */
export class KeyValue {
    private original: string;
    private line: number;
    private changed: boolean;
    public key: string;
    public value: string;
    /**
     * Create a point.
     * @prop {number} line - The x value.
     * @prop {string} key - The x value.
     * @prop {string} value - The y value.
     */
    constructor(original: string, line: number) {
        this.original = original
        this.line = line
        this.changed = false
        this.key = ''
        this.value = ''
        this.parse()
    }

    getLine(): number {
        return this.line;
    }

    update(value: string) {
        this.changed = true;
        this.value = value;
    }

    parse() {
        // assuming this is always valid
        // TODO: error out if the parse fails
        // TODO: save the type of quotes so they can be returned to orignal
        const trimmed = this.original.trim();
        const [key, ...value] = trimmed.split('=');
        this.key = key;
        this.value = value.join("=").replace(/'|"/g, '');
    }

    toString() {
        if (!this.changed) {
            return this.original;
        }

        return `${this.key}="${this.value}"`;
    }
}

export class GrubFile {
    private lines: (KeyValue | string)[];
    private keyvals: Record<string, KeyValue>;

    constructor(data: string) {
        this.lines = [];
        this.keyvals = {};
        const lines = data.split('\n');
        for (const idx in lines) {
            const line = lines[idx]
            const trimmed = line.trim();
            if (trimmed.length === 0) {
                this.lines.push(line);
                continue;
            }

            if (trimmed[0] === '#') {
                this.lines.push(line);
                continue;
            }

            const keyval = new KeyValue(line, Number(idx));
            this.lines.push(keyval);
            // override existing keys, just like grub does
            this.keyvals[keyval.key] = keyval;
        }
    }

    values() {
        return this.lines.filter(value => (typeof value !== "string"))
    }

    keyvalues(): Record<string, KeyValue> {
        return this.keyvals;
    }

    updateValue(key: KeyValue | string, value: string) {
        let keyvalue = key as KeyValue;
        if (typeof key === "string") {
            keyvalue = this.keyvals[key];
            if (!keyvalue) {
                const lineNum = this.lines.length;
                keyvalue = new KeyValue(`${key}="${value}"`, lineNum);
                this.lines.push(keyvalue);
                this.keyvals[key] = keyvalue;
            }
        }

        keyvalue.update(value);
        const line = keyvalue.getLine();
        this.lines[line] = keyvalue;
        // only save the last entry of key to keyvalue store
        // to replicate the behavior of grub
        if (this.keyvals[keyvalue.key]?.getLine() === keyvalue.getLine()) {
            this.keyvals[keyvalue.key] = keyvalue;
        }
    }

    toFile() {
        return this.lines.map((val) => val.toString()).join('\n')
    }
}
