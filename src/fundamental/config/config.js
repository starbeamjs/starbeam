const KEYS = {
    LogLevel: "string",
    TraceFocus: "string",
};
export class ConfigEnvironment {
    static create(delegate) {
        return new ConfigEnvironment(delegate);
    }
    #delegate;
    constructor(delegate) {
        this.#delegate = delegate;
    }
    get isPresent() {
        return this.#delegate.hasConfig();
    }
    config() {
        let state = this.#delegate.getConfig();
        return Object.fromEntries(Object.entries(KEYS).map(([key, hint]) => [
            key,
            this.#delegate.parse(state, { key, hint }),
        ]));
    }
    describe(key) {
        let state = this.#delegate.getConfig();
        return this.#delegate.description(state, { key, hint: KEYS[key] });
    }
    get(key) {
        let state = this.#delegate.getConfig();
        return this.#delegate.parse(state, { key, hint: KEYS[key] });
    }
    set(key, value) {
        let state = this.#delegate.getConfig();
        let hint = KEYS[key];
        this.#delegate.insert(state, { key, hint, value });
    }
}
//# sourceMappingURL=config.js.map