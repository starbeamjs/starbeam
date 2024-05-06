import { isOneOf as isOneOfDev } from "./src/assertions/multi.js";
import { hasType as hasTypeDev } from "./src/assertions/types.js";
import {
  expected as expectedDev
} from './src/verify.js';

export {
  verified,
  verify
} from "./src/verify.js";

const noop = () => { };

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

export const expected: typeof expectedDev | null = import.meta.env.DEV ? expectedDev : null
export const hasType: typeof hasTypeDev = import.meta.env.DEV ? hasTypeDev : (noop as unknown as typeof hasTypeDev)
export const isOneOf: typeof isOneOfDev = import.meta.env.DEV ? isOneOfDev : (noop as typeof isOneOfDev)
