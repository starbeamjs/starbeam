import 'globals';

export {
  exhaustive,
  hasItems,
  hasLength,
  isEqual,
  isNotEqual,
  isNullable,
  isObject,
  isPresent,
} from "./src/assertions/basic.js";
export { isOneOf } from "./src/assertions/multi.js";
export { type TypeOf, hasType } from "./src/assertions/types.js";
export { type Expectation, expected, VerificationError } from "./src/verify.js";

import { verified as verifiedDev, verify as verifyDev } from "./src/verify.js";
export const verify: typeof verifyDev["noop"] = import.meta.env.DEV
  ? verifyDev
  : verifyDev.noop;

export const verified: typeof verifiedDev["noop"] = import.meta.env.DEV
  ? verifiedDev
  : verifiedDev.noop;
