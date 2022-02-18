import { type AnyPatternDSL, Described, type Pattern, type PatternResult } from "../expect.js";
import { type Failure, type PatternDetails, Success } from "../report.js";
export interface ToBeSerializer<T> {
    readonly expected: string | ((value: T) => string);
    readonly actual: string | ((value: T) => string);
}
export declare class ToBe<T> implements Pattern<unknown, T, undefined> {
    #private;
    readonly expected: T;
    readonly serializer?: ToBeSerializer<T> | undefined;
    constructor(expected: T, serializer?: ToBeSerializer<T> | undefined);
    readonly details: PatternDetails;
    check(actual: Described<T>): PatternResult<undefined>;
    success(): Success;
    failure(actualValue: Described<unknown>): Failure;
}
export declare function toBe<T>(value: T, serializer?: ToBeSerializer<T> | ((value: T) => string)): AnyPatternDSL<T>;
