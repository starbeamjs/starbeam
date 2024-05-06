import { isOneOf as isOneOfDev } from "./src/assertions/multi.js";
import { hasType as hasTypeDev } from "./src/assertions/types.js";
import type { VerifyFn } from "./src/verify.js";
import {
  expected as expectedDev,
  verify as verifyDev
} from "./src/verify.js";

export {
  verified
} from "./src/verify.js";

const noop: unknown = () => { };

export {
  exhaustive,
  hasItems,
  hasLength,
  isEqual,
  isNotEqual,
  isNullable,
  isObject,
  isPresent,
  isWeakKey,
} from "./src/assertions/basic.js";
export { type TypeOf } from "./src/assertions/types.js";
export { type Expectation, VerificationError } from "./src/verify.js";

export const expected: typeof expectedDev = import.meta.env.DEV ? expectedDev : (noop as typeof expectedDev)
export const hasType: typeof hasTypeDev = import.meta.env.DEV ? hasTypeDev : (noop as typeof hasTypeDev)
export const isOneOf: typeof isOneOfDev = import.meta.env.DEV ? isOneOfDev : (noop as typeof isOneOfDev)

export const verify: VerifyFn | null = import.meta.env.DEV
  ? verifyDev
  : null;
