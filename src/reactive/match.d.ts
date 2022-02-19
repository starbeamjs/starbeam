import type { AnyReactiveChoice } from "./choice.js";
import { ExtendsReactive } from "./base.js";
import { ReactiveMetadata } from "../core/metadata.js";
import type { Cell, Reactive } from "../fundamental/types.js";
import type { UNINITIALIZED } from "../fundamental/constants.js";
export declare type Matcher<C extends AnyReactiveChoice> = {
    [P in C["discriminant"]]: C["value"] extends undefined ? () => unknown : (value: C["value"] extends Reactive<infer T> ? T : never) => unknown;
};
export declare class ReactiveMatch<C extends AnyReactiveChoice, M extends Matcher<C>> extends ExtendsReactive<ReturnType<M[C["discriminant"]]>> {
    #private;
    readonly description: string;
    static match<C extends AnyReactiveChoice, M extends Matcher<C>>(reactive: ExtendsReactive<C>, matcher: M, description: string): ReactiveMatch<C, M>;
    private constructor();
    get current(): ReturnType<M[C["discriminant"]]>;
    get cells(): UNINITIALIZED | readonly Cell[];
    get metadata(): ReactiveMetadata;
}
