export interface TypeDescription {
    kind: "type";
    is: string;
}
export declare function TypeDescription(value: string): TypeDescription;
export interface ValueDescription {
    kind: "value";
    is: unknown;
    comment?: string;
}
export declare function ValueDescription(value: unknown, comment?: string): ValueDescription;
export interface PatternDetails {
    readonly name: string;
    readonly description: string;
    readonly scenario?: string;
}
export interface TestOutcome {
    success: boolean;
    pattern: PatternDetails;
}
export interface Success extends TestOutcome {
    kind: "success";
    success: true;
    message: string;
}
export declare function Success({ pattern, message, }: {
    pattern: PatternDetails;
    message: string;
}): Success;
export interface NotEqual extends TestOutcome {
    success: false;
    kind: "equality";
    expected: ValueDescription;
    actual: ValueDescription;
}
export declare function NotEqual({ actual, expected, pattern, }: {
    actual: ValueDescription;
    expected: ValueDescription;
    pattern: PatternDetails;
}): NotEqual;
export interface Mismatch extends TestOutcome {
    success: false;
    kind: "mismatch";
    description?: string;
    expected: ValueDescription;
    actual: ValueDescription;
}
declare type FailureArgs<F extends TestOutcome> = Omit<F, "success" | "kind" | "pattern">;
declare type TopLevelArgs<F extends TestOutcome> = FailureArgs<F> & {
    pattern: PatternDetails;
    description?: undefined;
};
declare type ChildArgs<F extends TestOutcome> = FailureArgs<F> & {
    pattern?: undefined;
    description: string;
};
export declare function Mismatch(args: TopLevelArgs<Mismatch>): Mismatch;
export declare function Mismatch(args: ChildArgs<Mismatch>): ChildFailure<Mismatch>;
export interface Invalid extends TestOutcome {
    success: false;
    kind: "invalid";
    message: string;
}
export declare function Invalid({ message, pattern, }: {
    message: string;
    pattern: PatternDetails;
}): Invalid;
export interface WrongType extends TestOutcome {
    success: false;
    kind: "wrong-type";
    actual: ValueDescription | TypeDescription;
    expected: TypeDescription;
}
export declare function WrongType({ actual, expected, pattern, }: {
    actual: ValueDescription | TypeDescription;
    expected: string;
    pattern: PatternDetails;
}): WrongType;
export interface Multiple extends TestOutcome {
    kind: "multiple";
    success: false;
    message: string;
    failures: readonly ChildFailure<Failure>[];
}
export declare type ChildFailure<T> = Omit<T, "pattern"> & {
    description: string;
};
export declare function Multiple({ message, pattern, failures, }: {
    message: string;
    pattern: PatternDetails;
    failures: readonly ChildFailure<Failure>[];
}): Multiple;
export declare type Failure = NotEqual | Invalid | Mismatch | WrongType | Multiple;
export declare type MatchResult = Success | Failure;
export interface Reporter {
    success(success: Success): void;
    failure(failure: Failure): never;
}
export declare function report(this: void, reporter: Reporter, result: Success): void;
export declare function report(this: void, reporter: Reporter, result: Failure): never;
export declare function report(this: void, reporter: Reporter, result: MatchResult): void | never;
export declare class JestReporter implements Reporter {
    success(_success: Success): void;
    failure(failure: Failure): never;
}
export {};
//# sourceMappingURL=report.d.ts.map