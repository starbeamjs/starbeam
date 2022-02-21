export class Timestamp {
    static initial() {
        return new Timestamp(1);
    }
    #timestamp;
    constructor(timestamp) {
        this.#timestamp = timestamp;
    }
    gt(other) {
        return this.#timestamp > other.#timestamp;
    }
    next() {
        return new Timestamp(this.#timestamp + 1);
    }
    toString() {
        return `#<Timestamp ${this.#timestamp}>`;
    }
}
//# sourceMappingURL=timestamp.js.map