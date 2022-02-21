import { isPresent } from "../utils/presence.js";
import { abstractify, assertCondition, DebugInformation } from "./core.js";
import { as, CreatedContext, DescribedContext, VerifyContext, } from "./verify-context.js";
/**
 * @strip.value value
 */
export function present(value, info) {
    if (value === null) {
        throw Error(DebugInformation.message(info, "unexpected null"));
    }
    else if (value === undefined) {
        throw Error(DebugInformation.message(info, "unexpected undefined"));
    }
    else {
        return value;
    }
}
const VERIFIER = new WeakMap();
export const Verifier = {
    implement(verifier, message) {
        VERIFIER.set(verifier, message);
    },
    context(verifier) {
        return verified(VERIFIER.get(verifier), isPresent);
    },
    assertion(verifier, updates, value) {
        let created = VERIFIER.get(verifier) ?? as("value");
        return created.update(IntoBuildContext.create(updates)).finalize(value)
            .message;
    },
};
function isCreatedContext(context) {
    return context !== undefined && context instanceof CreatedContext;
}
const IntoBuildContext = {
    create(into) {
        if (isCreatedContext(into)) {
            return into;
        }
        else if (into === undefined) {
            return CreatedContext.DEFAULT;
        }
        else {
            return DescribedContext.of(VerifyContext.from(into)).assert();
        }
    },
};
const verifyValue = abstractify((value, { verifier, context }) => {
    assertCondition(verifier(value), () => Verifier.assertion(verifier, IntoBuildContext.create(context).finalize(value).context, value));
});
/**
 * @strip.statement
 */
export function verify(value, verifier, context) {
    return verifyValue(value, { verifier, context });
}
/**
 * @strip.value value
 */
export function verified(value, verifier, context) {
    verifyValue(value, { verifier, context });
    return value;
}
export function exhaustive(_value, type) {
    if (type) {
        throw Error(`unexpected types left in ${type}`);
    }
    else {
        throw Error(`unexpected types left`);
    }
}
//# sourceMappingURL=assert.js.map