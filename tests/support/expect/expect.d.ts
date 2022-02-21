import { ReactiveMetadata } from "starbeam";
import { type Failure, type PatternDetails, type Reporter, Success, ValueDescription } from "./report.js";
export declare const Dynamism: {
    readonly constant: import("../../../src/core/metadata.js").ConstantMetadata;
    readonly dynamic: import("../../../src/core/metadata.js").DynamicMetadata;
};
export declare class Expects {
    #private;
    static get dynamic(): Expects;
    static get constant(): Expects;
    static html(content: string): Expects;
    private constructor();
    html(contents: string): Expects;
    get dynamism(): ReactiveMetadata | null;
    get contents(): string | null;
    assertDynamism(actual: ReactiveMetadata): void;
    assertContents(actual: string): void;
}
export declare type PatternResult<F = unknown, S = void> = PatternMatch<S> | PatternMismatch<F>;
export interface PatternMatch<T> {
    type: "match";
    value: T;
}
export declare function PatternMatch<S>(value: S): PatternMatch<S>;
export declare function PatternMatch(): PatternMatch<undefined>;
export interface PatternMismatch<T> {
    type: "mismatch";
    value: T;
}
export declare function PatternMismatch<F>(value: F): PatternMismatch<F>;
export declare function PatternMismatch(): PatternMismatch<undefined>;
export interface Pattern<In, Out extends In, F = unknown, S = void> {
    readonly details: PatternDetails;
    check(actual: Described<In>): PatternResult<F, S>;
    success(actual: Out, success: S): Success;
    failure(actual: Described<In>, failure: F): Failure;
}
export interface PatternDSL<In, Out extends In, F = unknown, S = void> extends Pattern<In, Out, F, S> {
    when(scenario: string): PatternDSL<In, Out, F, S>;
}
export declare type AnyPatternDSL<In, Out extends In = In> = PatternDSL<In, Out>;
export declare type PatternFor<P extends Pattern<unknown, unknown, unknown, unknown>> = P extends Pattern<infer In, infer Out, infer F, infer S> ? PatternImpl<In, Out, F, S> : never;
export declare class PatternImpl<In, Out extends In, F = unknown, S = void> implements PatternDSL<In, Out, F, S> {
    #private;
    static of<In, Out extends In, F, S>(pattern: Pattern<In, Out, F, S>): PatternImpl<In, Out, F, S>;
    private constructor();
    get details(): PatternDetails;
    when(scenario: string): PatternImpl<In, Out, F, S>;
    check(actual: Described<In>): PatternResult<F, S>;
    success(actual: Out, success: S): Success;
    failure(actual: Described<In>, failure: F): Failure;
    typecheck(_actual: In, state: PatternResult<S, F>): _actual is Out;
}
export declare type AnyPattern<In, Out extends In = In> = Pattern<In, Out>;
export declare class Expectations {
    #private;
    constructor(reporter: Reporter);
    expect<In, Out extends In>(actual: Described<In>, pattern: AnyPattern<In, Out>): void;
}
export declare class Described<T> {
    readonly value: T;
    readonly description?: string | undefined;
    static create<T>(value: T, description?: string): Described<T>;
    static is<T>(value: unknown): value is Described<T>;
    static from<T>(value: T | Described<T>): Described<T>;
    private constructor();
    as(description: string): Described<T>;
    toValueDescription(): ValueDescription;
}
export declare type IntoDescribed<T> = T | Described<T>;
export declare const value: typeof Described.create;
declare class Scenario {
    #private;
    static of(when: string): Scenario;
    private constructor();
    get when(): string;
}
export declare function when(scenario: string): Scenario;
declare function expectPattern<In, Out extends In>(actual: IntoDescribed<In>, pattern: AnyPatternDSL<In, Out>): asserts actual is Out;
declare function expectPattern<In, Out extends In>(scenario: Scenario, actual: IntoDescribed<In>, pattern: AnyPatternDSL<In, Out>): asserts actual is Out;
export declare const expect: typeof expectPattern;
/**
 * If you want to test that types check (or don't check, using ts-expect-error),
 * but don't want to actually run the code, wrap the block in this function.
 */
export declare function types(_callback: () => void): void;
export {};
//# sourceMappingURL=expect.d.ts.map