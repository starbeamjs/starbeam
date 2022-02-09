import type { CompleteContext, PartialVerifyContext } from "./assert.js";
export declare class DescribedContext {
    #private;
    static of(context: VerifyContext): DescribedContext;
    static get DEFAULT(): DescribedContext;
    private constructor();
    get context(): VerifyContext;
    update(partial: PartialVerifyContext | undefined): DescribedContext;
    assert(): CreatedContext<unknown>;
    butGot<In>(actual: (value: In) => string): CreatedContext<In>;
}
export interface Updater<In, NewIn extends In> {
    expected?(expected: string): string;
    relationship?(relationship: Relationship): Relationship;
    butGot?: (butGot: (value: In) => string) => (value: NewIn) => string;
}
export declare class CreatedContext<In = unknown> {
    #private;
    static create<In>(context: VerifyContext, butGot?: (value: In) => string): CreatedContext<In>;
    static get DEFAULT(): CreatedContext;
    private constructor();
    update(partial: CreatedContext | undefined): CreatedContext<In>;
    updating<NewIn extends In>({ expected: updateExpected, relationship: updateRelationship, butGot: updateButGot, }: Updater<In, NewIn>): CreatedContext<NewIn>;
    when(situation: string): CreatedContext<In>;
    butGot<In>(actual: (value: In) => string): CreatedContext<In>;
    finalize(value: In): FinalizedContext;
}
export declare class FinalizedContext {
    #private;
    static of(context: CompleteContext): FinalizedContext;
    protected constructor(context: CompleteContext);
    get message(): string;
    get context(): CompleteContext;
}
export declare class ExpectedContext {
    #private;
    static of(input: string): ExpectedContext;
    private constructor();
    assert(): DescribedContext;
    toBe(description: string): CreatedContext;
    toHave(description: string): CreatedContext<unknown[]>;
}
export declare function expected(input: string): ExpectedContext;
export declare function as(input: string): CreatedContext;
export interface Relationship {
    readonly kind: "to be" | "to have";
    readonly description: string;
}
export interface VerifyContext extends PartialVerifyContext {
    readonly when?: string;
    readonly expected: string;
    readonly relationship?: Relationship;
}
export declare const VerifyContext: {
    readonly withDefaults: (context: VerifyContext, { relationship }: PartialVerifyContext) => VerifyContext;
    readonly merge: (left: VerifyContext, right: PartialVerifyContext) => VerifyContext;
    readonly DEFAULT: VerifyContext;
    readonly from: typeof VerifyContextFrom;
};
declare function VerifyContextFrom(partial: PartialVerifyContext | undefined): VerifyContext;
export {};
