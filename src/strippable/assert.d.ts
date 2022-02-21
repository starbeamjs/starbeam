import { DebugInformation } from "./core.js";
import { CreatedContext, VerifyContext } from "./verify-context.js";
/**
 * @strip.value value
 */
export declare function present<T>(value: T | null | undefined, info?: DebugInformation): T;
export interface Verifier<In, Out extends In> {
    (value: In): value is Out;
}
export declare const Verifier: {
    implement<In, Out extends In>(verifier: Verifier<In, Out>, message: CreatedContext<In>): void;
    context<In_1>(verifier: Verifier<In_1, In_1>): CreatedContext<In_1>;
    assertion<In_2>(verifier: Verifier<In_2, In_2>, updates: IntoBuildContext | undefined, value: In_2): DebugInformation;
};
export interface PartialVerifier<In, Out extends In> {
    (value: In): value is Out;
    default?: VerifyContext;
    message?: (context: VerifyContext, value: In) => DebugInformation;
}
export declare type NormalizeContext<In> = (value: In, context: VerifyContext) => VerifyContext;
export declare type IntoBuildContext = CreatedContext | PartialVerifyContext;
declare const IntoBuildContext: {
    readonly create: (into: IntoBuildContext | undefined) => CreatedContext;
};
export interface CompleteContext extends VerifyContext {
    readonly actual: string | null;
}
export interface PartialVerifyContext {
    when?: string;
    expected?: string;
    relationship?: {
        kind: "to be" | "to have";
        description: string;
    };
}
export interface MutableVerifyContext {
    expected: string;
    relationship?: {
        kind: "to be" | "to have";
        description: string;
    };
    when?: string;
}
/**
 * @strip.statement
 */
export declare function verify<In, Out extends In>(value: In, verifier: Verifier<In, Out>, context?: IntoBuildContext): asserts value is Out;
/**
 * @strip.value value
 */
export declare function verified<Out extends In, In = unknown>(value: In, verifier: (value: In) => value is Out, context?: IntoBuildContext): Out;
export declare function exhaustive(_value: never, type?: string): never;
export {};
//# sourceMappingURL=assert.d.ts.map