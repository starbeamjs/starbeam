import { TIMELINE } from "../timeline/timeline.js";
import { DebugObjectLifetime, DebugFinalizer } from "./debug.js";
export class Lifetime {
    static scoped() {
        return new Lifetime(new WeakMap());
    }
    #lifetimes;
    constructor(tree) {
        this.#lifetimes = tree;
    }
    on = {
        finalize: (object, finalizer) => this.#lifetime(object).add(Finalizer.from(finalizer)),
    };
    finalize = (object) => {
        const lifetime = this.#lifetimes.get(object);
        if (lifetime) {
            // TODO: Make this strippable
            TIMELINE.withAssertFrame(() => lifetime.finalize(), `while destroying an object`);
        }
    };
    link = (parent, child) => {
        this.#lifetime(parent).link(this.#lifetime(child));
    };
    debug(...roots) {
        return roots
            .map((o) => this.#lifetime(o))
            .flatMap((lifetime) => {
            if (lifetime.isEmpty) {
                return [];
            }
            else {
                return [lifetime.debug()];
            }
        });
    }
    #lifetime(object) {
        let lifetime = this.#lifetimes.get(object);
        if (!lifetime) {
            lifetime = ObjectLifetime.of(object);
            this.#lifetimes.set(object, lifetime);
        }
        return lifetime;
    }
}
export const LIFETIME = Lifetime.scoped();
export class ObjectLifetime {
    static of(object) {
        return new ObjectLifetime(object, new Set(), new Set());
    }
    #object;
    #finalizers;
    #children;
    constructor(object, finalizers, children) {
        this.#object = object;
        this.#finalizers = finalizers;
        this.#children = children;
    }
    get isEmpty() {
        return this.#finalizers.size === 0 && this.#children.size === 0;
    }
    add(finalizer) {
        this.#finalizers.add(finalizer);
    }
    link(child) {
        this.#children.add(child);
    }
    finalize() {
        for (let child of this.#children) {
            child.finalize();
        }
        for (let finalizer of this.#finalizers) {
            Finalizer.finalize(finalizer);
        }
    }
    debug() {
        return DebugObjectLifetime.create(this.#object, new Set([...this.#finalizers].map((finalizer) => finalizer.debug())), new Set([...this.#children].map((child) => child.debug())));
    }
}
export class Finalizer {
    static create(callback, description, token) {
        return new Finalizer(callback, description, token);
    }
    static from(finalizer) {
        if (typeof finalizer === "function") {
            return Finalizer.create(finalizer, `(anonymous finalizer)`, undefined);
        }
        else if (Array.isArray(finalizer)) {
            return Finalizer.create(finalizer[0], `(anonymous finalizer)`, finalizer[1]);
        }
        else {
            return finalizer;
        }
    }
    static finalize(finalizer) {
        finalizer.#callback(finalizer.#token);
    }
    #callback;
    #description;
    #token;
    constructor(callback, description, token) {
        this.#callback = callback;
        this.#description = description;
        this.#token = token;
    }
    debug() {
        return DebugFinalizer.create(this.#description, JSON.stringify(this.#token));
    }
}
//# sourceMappingURL=lifetime.js.map