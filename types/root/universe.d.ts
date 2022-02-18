import type { anydom, minimal } from "@domtree/flavors";
import type { JSDOM } from "jsdom";
import { ReactiveDOM } from "../dom.js";
import { DomEnvironment } from "../dom/environment.js";
import type { HookBlueprint } from "../hooks/simple.js";
import { HookValue } from "../program-node/hook.js";
import type { ContentProgramNode, ProgramNode } from "../program-node/interfaces/program-node.js";
import { INSPECT } from "../utils.js";
import { RenderedRoot } from "./root.js";
export declare class Root {
    #private;
    static jsdom(jsdom: JSDOM): Root;
    /**
     * Create a new timeline in order to manage outputs using SimpleDOM. It's safe
     * to use SimpleDOM with the real DOM as long as you don't need runtime
     * features like event handlers and dynamic properties.
     */
    static environment(environment: DomEnvironment, description?: string): Root;
    [INSPECT](): string;
    readonly dom: ReactiveDOM;
    readonly on: {
        readonly advance: (callback: () => void) => (() => void);
    };
    private constructor();
    use<T>(hook: HookBlueprint<T>, { into }: {
        into: HookValue<T>;
    }): RenderedRoot<HookValue<T>>;
    render(node: ContentProgramNode, { append }: {
        append: anydom.ParentNode;
    }): RenderedRoot<minimal.ParentNode>;
    build<Cursor, Container>(node: ProgramNode<Cursor, Container>, { cursor, hydrate, }: {
        cursor: Cursor;
        hydrate: (cursor: Cursor) => Container;
    }): RenderedRoot<Container>;
}
