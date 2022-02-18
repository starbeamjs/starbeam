import { Described, PatternImpl, PatternMatch, PatternMismatch, } from "../expect.js";
import { NotEqual, Success, ValueDescription, } from "../report.js";
function serializeBoth({ expected, actual }, serializer) {
    return {
        expected: serialize(expected, serializer.expected),
        actual: serialize(actual, serializer.actual),
    };
}
function serialize(value, serialize) {
    if (typeof serialize === "function") {
        return serialize(value);
    }
    else {
        return serialize;
    }
}
export class ToBe {
    expected;
    serializer;
    constructor(expected, serializer) {
        this.expected = expected;
        this.serializer = serializer;
    }
    details = {
        name: "toBe",
        description: "Object.is equality",
    };
    check(actual) {
        if (Object.is(this.expected, actual.value)) {
            return PatternMatch();
        }
        else {
            return PatternMismatch();
        }
    }
    success() {
        if (this.serializer) {
            return Success({
                pattern: this.details,
                message: `value was ${serialize(this.expected, this.serializer.expected)}`,
            });
        }
        else {
            return Success({
                pattern: this.details,
                message: `value was equal to expected`,
            });
        }
    }
    failure(actualValue) {
        let { actual, expected } = this.#normalize(actualValue);
        return NotEqual({
            actual,
            expected,
            pattern: this.details,
        });
    }
    #normalize(describedActual) {
        let { serializer } = this;
        if (serializer) {
            let { actual, expected } = serializeBoth({
                actual: describedActual.value,
                expected: this.expected,
            }, this.serializer);
            return {
                expected: ValueDescription(expected),
                actual: ValueDescription(actual, describedActual.description),
            };
        }
        else {
            return {
                expected: ValueDescription(this.expected),
                actual: describedActual.toValueDescription(),
            };
        }
    }
}
export function toBe(value, serializer) {
    let normalized = typeof serializer === "function"
        ? { expected: serializer, actual: serializer }
        : serializer;
    return PatternImpl.of(new ToBe(value, normalized));
}
//# sourceMappingURL=comparison.js.map