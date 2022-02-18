import { Abstraction, ReactiveMetadata } from "starbeam";
import { toBe } from "./patterns.js";
import { JestReporter, Success, ValueDescription, } from "./report.js";
export const Dynamism = {
    constant: ReactiveMetadata.Constant,
    dynamic: ReactiveMetadata.Dynamic,
};
export class Expects {
    static get dynamic() {
        return new Expects(ReactiveMetadata.Dynamic, null);
    }
    static get constant() {
        return new Expects(ReactiveMetadata.Constant, null);
    }
    static html(content) {
        return new Expects(null, content);
    }
    #dynamism;
    #html;
    constructor(dynamism, html) {
        this.#dynamism = dynamism;
        this.#html = html;
    }
    html(contents) {
        return new Expects(this.#dynamism, contents);
    }
    get dynamism() {
        return this.#dynamism;
    }
    get contents() {
        return this.#html;
    }
    assertDynamism(actual) {
        if (this.#dynamism !== null) {
            expect(value(actual).as("dynamism"), toBe(this.#dynamism, (value) => value.describe()));
        }
    }
    assertContents(actual) {
        if (this.#html === null) {
            return;
        }
        Abstraction.wrap(() => {
            expect(actual, toBe(this.#html));
        });
    }
}
export function PatternMatch(value) {
    return { type: "match", value };
}
export function PatternMismatch(value) {
    return { type: "mismatch", value };
}
export class PatternImpl {
    static of(pattern) {
        return new PatternImpl(pattern, undefined);
    }
    #pattern;
    #scenario;
    constructor(pattern, scenario) {
        this.#pattern = pattern;
        this.#scenario = scenario;
    }
    get details() {
        return { ...this.#pattern.details, scenario: this.#scenario };
    }
    when(scenario) {
        return new PatternImpl(this.#pattern, scenario);
    }
    check(actual) {
        return this.#pattern.check(actual);
    }
    success(actual, success) {
        return this.#pattern.success(actual, success);
    }
    failure(actual, failure) {
        let outcome = this.#pattern.failure(actual, failure);
        return {
            ...outcome,
            pattern: {
                ...outcome.pattern,
                scenario: outcome.pattern.scenario ?? this.#scenario,
            },
        };
    }
    typecheck(_actual, state) {
        return state.type === "match";
    }
}
// export interface Pattern<In, Out extends In> {
//   check(actual: In): unknown;
//   typecheck(actual: In, checked: ReturnType<this["check"]>): actual is Out;
//   success(actual: Out): Success;
//   failure(actual: In): Failure;
// }
export class Expectations {
    #reporter;
    constructor(reporter) {
        this.#reporter = reporter;
    }
    expect(actual, pattern) {
        let checked = pattern.check(actual);
        if (checked.type === "match") {
            this.#reporter.success(pattern.success(checked.value, checked.value));
        }
        else {
            this.#reporter.failure(pattern.failure(actual, checked.value));
        }
    }
}
export class Described {
    value;
    description;
    static create(value, description) {
        return new Described(value, description);
    }
    static is(value) {
        return (typeof value === "object" && value !== null && value instanceof Described);
    }
    static from(value) {
        if (Described.is(value)) {
            return value;
        }
        else {
            return new Described(value);
        }
    }
    constructor(value, description) {
        this.value = value;
        this.description = description;
    }
    as(description) {
        return new Described(this.value, description);
    }
    toValueDescription() {
        return ValueDescription(this.value, this.description);
    }
}
export const value = Described.create;
class Scenario {
    static of(when) {
        return new Scenario(when);
    }
    #when;
    constructor(when) {
        this.#when = when;
    }
    get when() {
        return this.#when;
    }
}
export function when(scenario) {
    return Scenario.of(scenario);
}
function hasScenario(args) {
    return args[0] instanceof Scenario;
}
function expectPattern(...args) {
    if (hasScenario(args)) {
        let [scenario, actual, pattern] = args;
        Abstraction.not(() => new Expectations(new JestReporter()).expect(Described.from(actual), pattern.when(scenario.when)), 3);
    }
    else {
        let [actual, pattern] = args;
        Abstraction.not(() => new Expectations(new JestReporter()).expect(Described.from(actual), pattern), 3);
    }
}
export const expect = expectPattern;
/**
 * If you want to test that types check (or don't check, using ts-expect-error),
 * but don't want to actually run the code, wrap the block in this function.
 */
export function types(_callback) {
    // do nothing
}
//# sourceMappingURL=expect.js.map