import { assert, isVerifyContext } from "./core.js";
export class DescribedContext {
    static of(context) {
        return new DescribedContext(context);
    }
    static get DEFAULT() {
        return expected("value").assert();
    }
    #context;
    constructor(context) {
        this.#context = context;
    }
    get context() {
        return this.#context;
    }
    update(partial) {
        if (partial === undefined) {
            return this;
        }
        else {
            return DescribedContext.of(VerifyContext.merge(this.#context, partial));
        }
    }
    assert() {
        return CreatedContext.create(this.#context);
    }
    butGot(actual) {
        return CreatedContext.create(this.#context, actual);
    }
}
export class CreatedContext {
    static create(context, butGot) {
        return new CreatedContext(context, butGot);
    }
    static get DEFAULT() {
        return DescribedContext.DEFAULT.assert();
    }
    #context;
    #butGot;
    constructor(context, butGot) {
        this.#context = context;
        this.#butGot = butGot;
    }
    update(partial) {
        if (partial === undefined) {
            return this;
        }
        else {
            return CreatedContext.create(VerifyContext.merge(this.#context, partial.#context), this.#butGot);
        }
    }
    updating({ expected: updateExpected, relationship: updateRelationship, butGot: updateButGot, }) {
        if (updateExpected === undefined &&
            updateRelationship === undefined &&
            updateButGot === undefined) {
            return this;
        }
        let expected = updateExpected
            ? updateExpected(this.#context.expected)
            : this.#context.expected;
        let relationship = updateRelationship && this.#context.relationship
            ? updateRelationship(this.#context.relationship)
            : this.#context.relationship;
        let butGot = updateButGot && this.#butGot ? updateButGot(this.#butGot) : this.#butGot;
        return CreatedContext.create(VerifyContext.merge(this.#context, { expected, relationship }), butGot);
    }
    when(situation) {
        return CreatedContext.create(VerifyContext.merge(this.#context, { when: situation }), this.#butGot);
    }
    butGot(actual) {
        assert(this.#butGot === undefined, `You should only call .butGot on a CreatedContext if it was not already called. If you want to *update* butGot, call updating({ butGot })`);
        return CreatedContext.create(this.#context, actual);
    }
    finalize(value) {
        let actual = this.#butGot ? this.#butGot(value) : null;
        return FinalizedContext.of({
            ...this.#context,
            actual,
        });
    }
}
export class FinalizedContext {
    // static normalize<In>(
    //   transform: NormalizeContext<In>
    // ): CreatedBuildContextFor<In> {
    //   return (value: In) =>
    //     new BuildContext(transform as NormalizeContext<unknown>, value);
    // }
    static of(context) {
        return new FinalizedContext(context);
    }
    // readonly #value: unknown;
    // readonly #actual: (unknown) => string;
    // readonly #for: NormalizeContext<unknown>;
    #context;
    constructor(context) {
        this.#context = context;
    }
    get message() {
        let expected = this.#expected;
        let { actual } = this.#context;
        if (actual) {
            return `${expected}, but got ${actual}`;
        }
        else {
            return expected;
        }
    }
    get #expected() {
        let { expected, relationship, when } = this.#context;
        let expectation = `Expected ${expected}`;
        if (when) {
            expectation = `When ${when}, ${expectation}`;
        }
        if (relationship) {
            expectation = `${expectation} ${relationship.kind} ${relationship.description}`;
        }
        return expectation;
    }
    get context() {
        return this.#context;
    }
}
export class ExpectedContext {
    static of(input) {
        return new ExpectedContext(input);
    }
    #expected;
    constructor(input) {
        this.#expected = input;
    }
    assert() {
        return DescribedContext.of({
            expected: this.#expected,
        });
    }
    toBe(description) {
        return DescribedContext.of({
            expected: this.#expected,
            relationship: {
                kind: "to be",
                description,
            },
        }).assert();
    }
    toHave(description) {
        return DescribedContext.of({
            expected: this.#expected,
            relationship: {
                kind: "to have",
                description,
            },
        }).butGot((array) => array.length === 1 ? `1 item` : `${array.length} items`);
    }
}
export function expected(input) {
    return ExpectedContext.of(input);
}
export function as(input) {
    return DescribedContext.of({ expected: input }).assert();
}
export const VerifyContext = {
    withDefaults(context, { relationship }) {
        if (context.relationship === undefined) {
            return {
                ...context,
                relationship,
            };
        }
        else {
            return context;
        }
    },
    merge(left, right) {
        let merged = { ...left };
        if (right.relationship) {
            merged.relationship = { ...right.relationship };
        }
        if (right.expected) {
            merged.expected = right.expected;
        }
        if (right.when) {
            merged.when = right.when;
        }
        return merged;
    },
    DEFAULT: VerifyContextFrom(undefined),
    from: VerifyContextFrom,
};
function VerifyContextFrom(partial) {
    if (partial === undefined) {
        return {
            expected: "value",
        };
    }
    else if (isVerifyContext(partial)) {
        return partial;
    }
    else {
        return {
            ...partial,
            expected: "value",
        };
    }
}
//# sourceMappingURL=verify-context.js.map