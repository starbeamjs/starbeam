import { Overload } from "./overload.js";
import type { AdHocCheck, Check } from "./utils.js";

export function checker<Out extends In, In>(
  assertion: [Check<Out, In>] | AdHocCheck<Out, In>
): Check<Out, In> {
  return Overload<Check<Out, In>>().resolve(assertion, {
    1: (arg) => arg,
    2: (test, failure) => ({ test, failure }),
  });
}
