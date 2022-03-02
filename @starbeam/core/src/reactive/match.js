import { Abstraction } from "@starbeam/debug";
import { Memo } from "@starbeam/reactive";
export function match(enumeration, matcher, description = Abstraction.callerFrame()) {
    return Memo(() => {
        return enumeration.current.match(matcher);
    }, description);
}
