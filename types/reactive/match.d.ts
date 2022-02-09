import type { AnyReactiveChoice } from "./choice.js";
import type { AbstractReactive } from "./core.js";
import { HasMetadata, ReactiveMetadata } from "./metadata.js";
export declare type Matcher<C extends AnyReactiveChoice> = {
    [P in C["discriminant"]]: C["value"] extends undefined ? () => unknown : (value: C["value"] extends AbstractReactive<infer T> ? T : never) => unknown;
};
export declare class ReactiveMatch<C extends AnyReactiveChoice, M extends Matcher<C>> extends HasMetadata implements AbstractReactive<ReturnType<M[C["discriminant"]]>> {
    #private;
    readonly description: string;
    static match<C extends AnyReactiveChoice, M extends Matcher<C>>(reactive: AbstractReactive<C>, matcher: M, description: string): ReactiveMatch<C, M>;
    private constructor();
    get current(): ReturnType<M[C["discriminant"]]>;
    get metadata(): ReactiveMetadata;
}
