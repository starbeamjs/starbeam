import { Abstraction } from "@starbeam/debug";
import { Memo, type ReactiveValue } from "@starbeam/reactive";
import type { Enumeration, MatcherFor } from "@starbeam/utils";

export function match<E extends Enumeration, U>(
  enumeration: ReactiveValue<E>,
  matcher: MatcherFor<E, U>,
  description = Abstraction.callerFrame()
): ReactiveValue<U> {
  return Memo(() => {
    return enumeration.current.match(matcher);
  }, description);
}
