import type { PartialVerifyContext } from "./assert.js";
import type { FinalizedContext, VerifyContext } from "./verify-context.js";
import type { UnsafeAny } from "./wrapper.js";
/** @internal */
export declare const assertCondition: (condition: UnsafeAny, info: () => DebugInformation) => asserts condition;
/**
 * @strip.noop
 */
export declare function assert(condition: UnsafeAny, info?: DebugInformation): asserts condition;
export declare function isVerifyContext(context: PartialVerifyContext): context is VerifyContext;
export declare type DebugInformation = FinalizedContext | string;
export declare const DebugInformation: {
    readonly message: typeof message;
};
declare function message(info: DebugInformation | undefined, defaultValue: DebugInformation): string;
declare function message(info: DebugInformation): string;
export declare const narrow: <T, U extends T>(value: T, predicate: (input: T) => asserts input is U) => U;
export declare function abstractify<F extends (...args: any[]) => any>(f: F): F;
export {};
//# sourceMappingURL=core.d.ts.map