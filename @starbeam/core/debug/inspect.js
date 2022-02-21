export const DEBUG = Symbol.for("starbeam.debug");
class Buffer {
    static empty() {
        return new Buffer("", 0);
    }
    static serialize(buffer) {
        return buffer.#buffer;
    }
    #buffer;
    #indents = 0;
    constructor(buffer, indents) {
        this.#buffer = buffer;
        this.#indents = indents;
    }
    get #indentation() {
        return "  ".repeat(this.#indents);
    }
    start() {
        this.#buffer += this.#indentation;
    }
    end() {
        this.#buffer += `\n`;
    }
    fragment(contents) {
        this.#buffer += contents;
    }
    indent() {
        this.#indents += 1;
    }
    outdent() {
        this.#indents -= 1;
    }
}
export class ContentBuilder {
    static empty() {
        return new ContentBuilder([]);
    }
    static serialize(builder) {
        let buffer = Buffer.empty();
        ContentBuilder.finalize(builder).append(buffer);
        return Buffer.serialize(buffer);
    }
    static finalize(builder) {
        if (builder.#atoms.length === 0) {
            return EMPTY;
        }
        else if (builder.#atoms.length === 1) {
            return builder.#atoms[0];
        }
        else {
            return new Group(builder.#atoms);
        }
    }
    #atoms;
    constructor(content) {
        this.#atoms = content;
    }
    line = {
        start: (content) => {
            this.#atoms.push(START_LINE);
            if (content) {
                this.fragment(content);
            }
            return this;
        },
        end: (content) => {
            this.fragment(content);
            this.line.new();
            return this;
        },
        next: (content) => {
            this.line.new();
            this.fragment(content);
            return this;
        },
        new: () => {
            this.#atoms.push(END_LINE);
            return this;
        },
    };
    debug(value) {
        switch (typeof value) {
            case "object": {
                if (value === null) {
                    return this.fragment(`null`);
                }
                else if (Array.isArray(value)) {
                    return this.debug(FormatArray.of(value));
                }
                else if (isDebug(value)) {
                    value[DEBUG](this);
                    return this;
                }
                else {
                    break;
                }
            }
            case "function": {
                if (value.name) {
                    return this.fragment(`function ${value.name}`);
                }
                else {
                    return this.fragment(`(anonymous function)`);
                }
            }
        }
        throw Error("todo: Not implemented: defaultDebug");
    }
    add(content) {
        this.#atoms.push(...content.atoms);
        return this;
    }
    mapped(items, mapper) {
        for (let item of items) {
            mapper(this, item);
        }
        return this;
    }
    nest(callback) {
        this.#atoms.push(INDENT);
        callback(this);
        this.#atoms.push(OUTDENT);
        return this;
    }
    fragment(content) {
        this.#atoms.push(new Fragment(content));
        return this;
    }
    serialize() {
        let buffer = Buffer.empty();
        for (let atom of this.#atoms) {
            atom.append(buffer);
        }
        return Buffer.serialize(buffer);
    }
}
class Indent {
    append(buffer) {
        buffer.indent();
    }
    atoms = [this];
}
const INDENT = new Indent();
class Outdent {
    append(buffer) {
        buffer.outdent();
    }
    atoms = [this];
}
const OUTDENT = new Outdent();
class StartLine {
    append(buffer) {
        buffer.start();
    }
    atoms = [this];
}
const START_LINE = new StartLine();
class EndLine {
    append(buffer) {
        buffer.end();
    }
    atoms = [this];
}
const END_LINE = new EndLine();
class Fragment {
    contents;
    constructor(contents) {
        this.contents = contents;
    }
    append(buffer) {
        buffer.fragment(this.contents);
    }
    atoms = [this];
}
class Empty {
    append(_buffer) {
        // noop
    }
    atoms = [];
}
const EMPTY = new Empty();
class Group {
    atoms;
    constructor(atoms) {
        this.atoms = atoms;
    }
    append(buffer) {
        for (let item of this.atoms) {
            item.append(buffer);
        }
    }
}
export function content(string) {
    let lines = string.split("\n");
    if (lines.length === 0) {
        return EMPTY;
    }
    else if (lines.length === 1) {
        return new Group([new Fragment(string), START_LINE]);
    }
    else {
        let [first, ...rest] = lines;
        let last = rest.pop();
        let atoms = [new Fragment(first)];
        for (let item of rest) {
            atoms.push(START_LINE, new Fragment(item), END_LINE);
        }
        if (last) {
            atoms.push(START_LINE, new Fragment(last));
        }
        return new Group(atoms);
    }
}
function isDebug(value) {
    return typeof value === "object" && value !== null && DEBUG in value;
}
export function debug(value) {
    let builder = ContentBuilder.empty();
    builder.debug(value);
    return ContentBuilder.serialize(builder);
}
class FormatArray {
    static of(array) {
        return new FormatArray(array);
    }
    #array;
    constructor(array) {
        this.#array = array;
    }
    [DEBUG](builder) {
        return builder.line
            .end(`[`)
            .nest((nested) => nested.mapped(this.#array, (b, item) => b.debug(item)))
            .line.next(`]`);
    }
}
//# sourceMappingURL=inspect.js.map