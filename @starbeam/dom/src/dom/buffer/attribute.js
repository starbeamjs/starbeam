import { assert, exhaustive, expected, has, is, isObject, Position, positioned, present, QualifiedName, verified, verify, Wrapper, } from "@starbeam/core";
import { escapeAttrValue } from "./escape.js";
export class HtmlAttribute {
    static is(value) {
        return isObject(value) && value instanceof this;
    }
    static class(initial) {
        return ConcatAttribute.class(initial);
    }
    static concat(name, initial, separator) {
        return ConcatAttribute.create(name, initial, separator);
    }
    static default(name, initial) {
        return ClobberAttribute.create(name, initial);
    }
}
export class ConcatAttribute extends HtmlAttribute {
    name;
    static class(initial) {
        return new ConcatAttribute(QualifiedName("class"), initial ? [initial] : null, " ");
    }
    static create(name, initial, separator) {
        return new ConcatAttribute(name, initial ? [initial] : null, separator);
    }
    #value;
    #separator;
    constructor(name, value, separator) {
        super();
        this.name = name;
        this.#value = value;
        this.#separator = separator;
    }
    serializeInto(buffer, { prefix }) {
        if (this.#value) {
            if (prefix) {
                buffer.append(prefix);
            }
            buffer.append(`${Wrapper.getInner(this.name)}="`);
            // TODO: Should we escape the separator
            for (let [part, position] of positioned(this.#value)) {
                buffer.append(escapeAttrValue(part));
                if (Position.hasNext(position)) {
                    buffer.append(this.#separator);
                }
            }
            buffer.append(`"`);
        }
    }
    #push(...parts) {
        if (this.#value) {
            this.#value.push(...parts);
        }
        else {
            this.#value = parts;
        }
    }
    // merge(newValue: string | null);
    // merge(newValue: this);
    merge(newValue) {
        let update = this.#normalize(newValue);
        if (update === null) {
            this.#value = null;
        }
        else {
            this.#push(...update);
        }
    }
    #normalize(value) {
        if (ConcatAttribute.is(value)) {
            return value.#value;
        }
        else {
            verify(value, is.nullable(has.typeof("string")));
            return value ? [value] : null;
        }
    }
}
export class ClobberAttribute extends HtmlAttribute {
    name;
    static create(name, value) {
        return new ClobberAttribute(name, value);
    }
    #value;
    constructor(name, value) {
        super();
        this.name = name;
        this.#value = value;
    }
    serializeInto(buffer, options) {
        serializeAttr(buffer, options, this.name, this.#value);
    }
    get value() {
        return this.#value;
    }
    merge(newValue) {
        if (ClobberAttribute.is(newValue)) {
            this.#value = newValue.#value;
        }
        else {
            verify(newValue, is.nullable(has.typeof("string")), expected(`value passed to ClobberAttribute#merge`).toBe(`another ClobberAttribute, a string or null`));
            this.#value = newValue;
        }
    }
}
export class IdempotentAttribute extends HtmlAttribute {
    name;
    static create(name, value) {
        return new IdempotentAttribute(name, value);
    }
    #value;
    constructor(name, value) {
        super();
        this.name = name;
        this.#value = value;
    }
    merge(newValue) {
        let update = this.#normalize(newValue);
        newValue instanceof IdempotentAttribute ? newValue.#value : newValue;
        assert(this.#value === update, `An idempotent attribute must have the same value every time it was set. The current value of ${Wrapper.getInner(this.name)} was ${this.#value}, but you passed ${update}`);
    }
    #normalize(value) {
        if (IdempotentAttribute.is(value)) {
            return value.#value;
        }
        else {
            return verified(value, is.nullable(has.typeof("string")));
        }
    }
    serializeInto(buffer, options) {
        serializeAttr(buffer, options || null, this.name, this.#value);
    }
}
export class AttributesBuffer {
    static empty() {
        return new AttributesBuffer();
    }
    #attrs = new Map();
    initialize(attr) {
        this.#attrs.set(Wrapper.getInner(attr.name), attr);
    }
    merge(name, value) {
        let attr = present(this.#attrs.get(Wrapper.getInner(name)));
        attr.merge(value);
    }
    idempotent(attr) {
        let current = this.#attrs.get(Wrapper.getInner(attr.name));
        if (current) {
            current.merge(attr);
        }
        else {
            this.initialize(attr);
        }
        return this;
    }
    serializeInto(buffer, options) {
        buffer.appending(nullableList(this.#attrs.values()), (attrs) => {
            for (let attr of attrs) {
                attr.serializeInto(buffer, { prefix: " " });
            }
        }, options || null);
    }
}
export function attrFor(name, value, type) {
    if (Array.isArray(type)) {
        return ConcatAttribute.create(name, value, type[1]);
    }
    else {
        switch (type) {
            case "default": {
                switch (Wrapper.getInner(name)) {
                    case "class":
                        return ConcatAttribute.create(name, value, " ");
                    default:
                        return ClobberAttribute.create(name, value);
                }
            }
            case "clobber":
                return ClobberAttribute.create(name, value);
            case "idempotent":
                return IdempotentAttribute.create(name, value);
            default:
                exhaustive(type, "AttrType");
        }
    }
}
function nullableList(iterable) {
    let list = [...iterable];
    return list.length === 0 ? null : list;
}
function serializeAttr(buffer, options, name, value) {
    buffer.appending(value, (v) => {
        buffer.append(`${Wrapper.getInner(name)}="`);
        buffer.append(escapeAttrValue(v));
        buffer.append(`"`);
    }, options);
}
//# sourceMappingURL=attribute.js.map