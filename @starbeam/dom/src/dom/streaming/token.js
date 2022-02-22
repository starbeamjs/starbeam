import { is, verified } from "@starbeam/core";
import { MINIMAL } from "./compatible-dom.js";
const TOKEN_IDS = new WeakMap();
export class Tokens {
    environment;
    static create(environment) {
        return new Tokens(environment, 0);
    }
    #id;
    constructor(environment, id) {
        this.environment = environment;
        this.#id = id;
    }
    nextToken() {
        return Token.of(String(this.#id++));
    }
    mark(buffer, marker, body) {
        let token = this.nextToken();
        marker.mark(buffer, token, body);
        return Dehydrated.create(this.environment, token, marker.hydrator);
    }
}
export class Token {
    // @internal
    static of(tokenId) {
        return new Token(tokenId);
    }
    #id;
    constructor(token) {
        this.#id = token;
        TOKEN_IDS.set(this, token);
    }
}
export class Dehydrated {
    environment;
    /**
     * @internal
     */
    static create(environment, token, hydrator) {
        return new Dehydrated(environment, token, hydrator);
    }
    /**
     * @internal
     */
    static hydrate(environment, hydrator, container) {
        return hydrator.#hydrator.hydrate(environment, container, hydrator.#token);
    }
    #environment;
    #token;
    #hydrator;
    constructor(environment, token, hydrator) {
        this.environment = environment;
        this.#environment = environment;
        this.#token = token;
        this.#hydrator = hydrator;
    }
    get dom() {
        return LazyDOM.create(this.#environment, this);
    }
}
export class LazyDOM {
    environment;
    static create(environment, dehydrated) {
        return new LazyDOM(environment, dehydrated, null);
    }
    #dehydrated;
    #node;
    constructor(environment, dehyrated, node) {
        this.environment = environment;
        this.#dehydrated = dehyrated;
        this.#node = node;
    }
    get(inside) {
        if (this.#node === null) {
            this.#node = Dehydrated.hydrate(this.environment, this.#dehydrated, inside);
        }
        return this.#node;
    }
    insert(at) {
        MINIMAL.insert(this.get(at.parent), at);
    }
}
// @internal
export function tokenId(token) {
    return verified(TOKEN_IDS.get(token), is.Present);
}
//# sourceMappingURL=token.js.map