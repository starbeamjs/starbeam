import type { anydom, minimal } from "@domtree/flavors";
import { ReactiveDOM } from "../dom.js";
import type { DomEnvironment } from "../dom/environment.js";
import { HookBlueprint, HookConstructor } from "../hooks/simple.js";
import { HookValue } from "../program-node/hook.js";
import type { ContentProgramNode, ProgramNode } from "../program-node/interfaces/program-node.js";
import { Cell } from "../reactive/cell.js";
import type { AnyReactiveChoice } from "../reactive/choice.js";
import type { AbstractReactive, Reactive } from "../reactive/core.js";
import { Memo } from "../reactive/functions/memo.js";
import { Matcher, ReactiveMatch } from "../reactive/match.js";
import { InnerDict, ReactiveRecord } from "../reactive/record.js";
import { Static } from "../reactive/static.js";
import { IntoFinalizer, UniverseLifetime } from "./lifetime/lifetime.js";
import { Profile } from "./profile.js";
import { RenderedRoot } from "./root.js";
export declare const TIMELINE: unique symbol;
export declare class Universe {
    #private;
    /**
     * Create a new timeline in order to manage outputs using SimpleDOM. It's safe
     * to use SimpleDOM with the real DOM as long as you don't need runtime
     * features like event handlers and dynamic properties.
     */
    static environment(environment: DomEnvironment, profile?: Profile): Universe;
    /** @internal */
    finalize(object: object): void;
    /** @internal */
    withAssertFrame(callback: () => void, description: string): void;
    readonly dom: ReactiveDOM;
    readonly on: {
        readonly destroy: (object: object, finalizer: IntoFinalizer) => void;
    };
    get lifetime(): UniverseLifetime;
    readonly reactive: PropertyDecorator;
    readonly cached: PropertyDecorator;
    private constructor();
    hook<T>(callback: HookConstructor<T>, description: string): HookBlueprint<T>;
    use<T>(hook: HookBlueprint<T>, { into }: {
        into: HookValue<T>;
    }): RenderedRoot<HookValue>;
    get<T extends object, K extends keyof T>(object: T, key: K): AbstractReactive<T[K]>;
    cell<T>(value: T, description?: string): Cell<T>;
    memo<T>(callback: () => T, description?: string): Memo<T>;
    static<T>(value: T): Static<T>;
    match<C extends AnyReactiveChoice>(reactive: Reactive<C>, matcher: C extends infer ActualC ? ActualC extends AnyReactiveChoice ? Matcher<ActualC> : never : never, description?: string): ReactiveMatch<C, typeof matcher>;
    record<T extends InnerDict>(dict: T): ReactiveRecord<T>;
    build<Cursor, Container>(node: ProgramNode<Cursor, Container>, { cursor, hydrate, }: {
        cursor: Cursor;
        hydrate: (cursor: Cursor) => Container;
    }): RenderedRoot<Container>;
    render(node: ContentProgramNode, { append }: {
        append: anydom.ParentNode;
    }): RenderedRoot<minimal.ParentNode>;
}
