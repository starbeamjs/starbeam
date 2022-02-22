import { is, mutable, verified } from "@starbeam/core";
import { ElementBodyBuffer, HtmlBuffer, } from "../buffer/body.js";
import { ATTRIBUTE_MARKER, CHARACTER_DATA_MARKER, CONTENT_RANGE_MARKER, ELEMENT_MARKER, } from "./marker.js";
export const ContentOperationOptions = {
    requestedToken(options) {
        return options === undefined ? false : options.token;
    },
};
export const TOKEN = { token: true };
export class ElementHeadConstructor {
    static create(tokens, buffer) {
        return new ElementHeadConstructor(tokens, buffer);
    }
    #tokens;
    #buffer;
    constructor(tokens, buffer) {
        this.#tokens = tokens;
        this.#buffer = buffer;
    }
    get environment() {
        return this.#tokens.environment;
    }
    attr(qualifiedName, attrValue, options) {
        this.#buffer.attr(qualifiedName, attrValue);
        if (ContentOperationOptions.requestedToken(options)) {
            return this.#tokens.mark(this.#buffer, ATTRIBUTE_MARKER.forName(qualifiedName));
        }
    }
    body(construct) {
        let body = ContentConstructor.create(this.#tokens, this.#buffer.body());
        return construct ? construct(body) : body;
    }
    empty(type = "normal") {
        return this.#buffer.empty(type);
    }
}
export const ElementBodyConstructor = {
    flush(content) {
        return ElementBodyBuffer.flush(ContentConstructor.finalize(content));
    },
};
export class ContentConstructor {
    static create(tokens, buffer) {
        return new ContentConstructor(tokens, buffer);
    }
    static finalize(content) {
        return content.#buffer;
    }
    #tokens;
    #buffer;
    constructor(tokens, buffer) {
        this.#tokens = tokens;
        this.#buffer = buffer;
    }
    fragment(contents) {
        let result;
        let range = this.#tokens.mark(this.#buffer, CONTENT_RANGE_MARKER, (buffer) => {
            result = contents(ContentConstructor.create(this.#tokens, buffer));
            return buffer;
        });
        return { result: verified(result, is.Present), range };
    }
    text(data, options) {
        return this.#data((b) => b.text(data), options);
    }
    comment(data, options) {
        return this.#data((b) => b.comment(data), options);
    }
    element(tag, construct, withToken) {
        let returnValue = undefined;
        this.#buffer.element(tag, (buffer) => {
            let head = ElementHeadConstructor.create(this.#tokens, buffer);
            if (withToken) {
                let token = this.#tokens.mark(buffer, ELEMENT_MARKER);
                let body = construct(head);
                returnValue = withToken(token, body);
            }
            else {
                returnValue = construct(head);
            }
        });
        return returnValue;
    }
    #data(operation, options) {
        if (ContentOperationOptions.requestedToken(options)) {
            return this.#tokens.mark(this.#buffer, CHARACTER_DATA_MARKER, operation);
        }
        else {
            operation(this.#buffer);
        }
    }
}
/**
 * `TreeConstructor` builds up a valid string of HTML, which it then gives to the browsers'
 */
export class TreeConstructor extends ContentConstructor {
    environment;
    static html(environment) {
        return new TreeConstructor(HtmlBuffer.create(), environment.tokens, environment);
    }
    #buffer;
    constructor(buffer, tokens, environment) {
        super(tokens, buffer);
        this.environment = environment;
        this.#buffer = buffer;
    }
    insertAt(cursor) {
        cursor.mutate(this.environment).insertHTML(this.#buffer.serialize());
    }
    replace(placeholder) {
        mutable(placeholder).outerHTML = this.#buffer.serialize();
    }
}
export class HeadConstructor {
    static of(buffer, tokens) {
        return new HeadConstructor(buffer, tokens);
    }
    #buffer;
    #tokens;
    constructor(buffer, tokens) {
        this.#buffer = buffer;
        this.#tokens = tokens;
    }
    attr(construct, token) {
        this.#buffer.attr(construct.name, construct.value);
        if (ContentOperationOptions.requestedToken(token)) {
            return this.#tokens.mark(this.#buffer, ATTRIBUTE_MARKER.forName(construct.name));
        }
    }
}
//# sourceMappingURL=tree-constructor.js.map