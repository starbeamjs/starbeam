import type { ExtendsReactive } from "./base.js";
import { HasMetadata, ReactiveMetadata } from "../core/metadata.js";
export declare class ReactiveChoice<T, K extends string = string> extends HasMetadata {
    #private;
    readonly value: ExtendsReactive<T> | undefined;
    readonly description: string;
    static create<T, K extends string>(description: string, disciminant: K, value?: ExtendsReactive<T>): ReactiveChoice<T>;
    private constructor();
    get discriminant(): K;
    get metadata(): ReactiveMetadata;
}
export declare type AnyReactiveChoice = ReactiveChoice<unknown>;
export declare type Type<T> = (value: unknown) => value is T;
export declare type Variant<T> = [discriminant: string, value?: Type<T>];
export declare type TypeFor<T extends Type<unknown> | undefined> = T extends undefined ? undefined : T extends Type<infer V> ? V : never;
declare type ValueFor<C extends AnyReactiveChoice, K extends C["discriminant"]> = C extends {
    discriminant: K;
    value: infer V;
} ? V : never;
interface ReactiveChoiceConstructor<C extends AnyReactiveChoice> {
    <K extends C["discriminant"]>(discriminant: K): C;
    <K extends C["discriminant"]>(discriminant: K, value: ValueFor<C, K>): C;
}
export declare class ReactiveCases<C extends AnyReactiveChoice> {
    static define<C extends AnyReactiveChoice>(description: string, def: (choices: ReactiveCases<never>) => ReactiveCases<C>): ReactiveChoiceConstructor<C>;
    add<K extends string>(discriminant: K): ReactiveCases<C | ReactiveChoice<void, K>>;
    add<K extends string, T>(discriminant: K, value: Type<T>): ReactiveCases<C | ReactiveChoice<T, K>>;
    done(description: string): ReactiveChoiceConstructor<C>;
}
export {};
