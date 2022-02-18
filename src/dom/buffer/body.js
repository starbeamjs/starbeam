import { exhaustive } from "../../strippable/assert.js";
import { QualifiedName } from "../../strippable/wrapper.js";
import { attrFor, AttributesBuffer, } from "./attribute.js";
// eslint-disable-next-line import/no-cycle
import { escapeCommentValue, escapeTextValue } from "./escape.js";
export class Buffer {
    static empty() {
        return new Buffer([]);
    }
    #parts;
    constructor(parts) {
        this.#parts = parts;
    }
    append(part) {
        this.#parts.push(part);
    }
    appending(value, callback, options) {
        if (value !== null) {
            let prefix = options?.prefix;
            if (prefix) {
                this.append(prefix);
            }
            callback(value);
        }
    }
    serializeInto(buffer) {
        for (let part of this.#parts) {
            buffer.append(part);
        }
    }
    serialize() {
        return this.#parts.join("");
    }
}
export class ElementBodyBuffer {
    static create(state) {
        return new ElementBodyBuffer({
            ...state,
            content: HtmlBuffer.of(state.buffer),
        });
    }
    static flush(builder) {
        builder.#buffer.append(`</${builder.#tag}>`);
    }
    #state;
    constructor(state) {
        this.#state = state;
    }
    get #tag() {
        return this.#state.tag;
    }
    get #buffer() {
        return this.#state.buffer;
    }
    get #content() {
        return this.#state.content;
    }
    empty() {
        return this;
    }
    html(html) {
        this.#content.html(html);
        return this;
    }
    text(data) {
        this.#content.text(data);
        return this;
    }
    comment(data) {
        this.#content.comment(data);
        return this;
    }
    element(tag, build) {
        this.#content.element(tag, build);
        return this;
    }
}
export class HtmlBuffer {
    static create() {
        return new HtmlBuffer(Buffer.empty());
    }
    static of(buffer) {
        return new HtmlBuffer(buffer);
    }
    #buffer;
    constructor(buffer) {
        this.#buffer = buffer;
    }
    html(_data) {
        throw Error("todo: Insert HTML");
    }
    text(data) {
        this.#buffer.append(escapeTextValue(data));
        return this;
    }
    comment(data) {
        this.#buffer.append(`<!--`);
        this.#buffer.append(escapeCommentValue(data));
        this.#buffer.append(`-->`);
        return this;
    }
    element(tag, build) {
        let head = ElementHeadBuffer.tagged(tag, this.#buffer);
        let body = build(head);
        if (body) {
            ElementBodyBuffer.flush(body);
        }
        return this;
    }
    serialize() {
        return this.#buffer.serialize();
    }
}
export class ElementHeadBuffer {
    static tagged(tag, buffer) {
        return new ElementHeadBuffer({ tag, buffer });
    }
    #state;
    #attributes = AttributesBuffer.empty();
    constructor(state) {
        this.#state = state;
    }
    get #tag() {
        return this.#state.tag;
    }
    get #buffer() {
        return this.#state.buffer;
    }
    attrs(map) {
        for (let [qualifiedName, attrValue] of map) {
            this.attr(qualifiedName, this.#normalizeAttrValue(attrValue));
        }
        return this;
    }
    attr(qualifiedName, attrValue) {
        let { value, type } = this.#normalizeAttrValue(attrValue);
        let attribute = attrFor(QualifiedName(qualifiedName), value, type);
        this.#attributes.initialize(attribute);
        return this;
    }
    idempotentAttr(qualifiedName, attrValue) {
        let attribute = attrFor(QualifiedName(qualifiedName), attrValue, "idempotent");
        this.#attributes.idempotent(attribute);
        return this;
    }
    concatAttr(qualifiedName, value, separator) {
        let attribute = attrFor(QualifiedName(qualifiedName), value, [
            "concat",
            separator,
        ]);
        this.#attributes.idempotent(attribute);
        return this;
    }
    /**
     * This is for splattributes
     */
    mergeAttr(qualifiedName, value) {
        this.#attributes.merge(QualifiedName(qualifiedName), value);
        return this;
    }
    #normalizeAttrValue(attr) {
        if (attr === null || typeof attr === "string") {
            return { value: attr, type: "default" };
        }
        else {
            return { type: "default", ...attr };
        }
    }
    #flush(options) {
        this.#buffer.append(`<${this.#tag}`);
        this.#attributes.serializeInto(this.#buffer);
        switch (options.body) {
            case "normal":
            case "void":
                this.#buffer.append(`>`);
                break;
            case "self-closing":
                this.#buffer.append(` />`);
                break;
            default:
                exhaustive(options.body);
        }
    }
    body() {
        this.#flush({ body: "normal" });
        return ElementBodyBuffer.create(this.#state);
    }
    empty(type = "normal") {
        this.#flush({ body: type });
        if (type === "normal") {
            this.#buffer.append(`</${this.#tag}>`);
        }
    }
}
//# sourceMappingURL=body.js.map