import { starbeam } from "./upstream.js";
export function TypeDescription(value) {
    return {
        kind: "type",
        is: value,
    };
}
export function ValueDescription(value, comment) {
    return {
        kind: "value",
        is: value,
        comment,
    };
}
export function Success({ pattern, message, }) {
    return {
        kind: "success",
        success: true,
        pattern,
        message,
    };
}
export function NotEqual({ actual, expected, pattern, }) {
    return {
        success: false,
        pattern,
        kind: "equality",
        expected,
        actual,
    };
}
export function Mismatch({ actual, expected, description, pattern, }) {
    return {
        success: false,
        pattern,
        kind: "mismatch",
        description,
        expected,
        actual,
    };
}
export function Invalid({ message, pattern, }) {
    return {
        success: false,
        pattern,
        kind: "invalid",
        message,
    };
}
export function WrongType({ actual, expected, pattern, }) {
    return {
        success: false,
        pattern,
        kind: "wrong-type",
        actual,
        expected: TypeDescription(expected),
    };
}
export function Multiple({ message, pattern, failures, }) {
    return {
        success: false,
        pattern,
        kind: "multiple",
        message,
        failures,
    };
}
export function report(reporter, result) {
    if (result.kind === "success") {
        reporter.success(result);
    }
    else {
        reporter.failure(result);
    }
}
export class JestReporter {
    success(_success) {
        // noop
    }
    failure(failure) {
        starbeam(failure);
        failed();
    }
}
function failed() {
    throw Error(`unexpected code execution after a Jest assertion should have failed`);
}
//# sourceMappingURL=report.js.map