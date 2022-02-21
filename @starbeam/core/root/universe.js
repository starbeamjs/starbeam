import { ReactiveDOM } from "../dom.js";
import { DomEnvironment } from "../dom/environment.js";
import { DOM, MINIMAL } from "../dom/streaming/compatible-dom.js";
import { TreeConstructor } from "../dom/streaming/tree-constructor.js";
import { HookCursor, HookProgramNode, HookValue, } from "../program-node/hook.js";
import { minimize } from "../strippable/minimal.js";
import { INSPECT } from "../utils.js";
import { LIFETIME } from "../core/lifetime/lifetime.js";
import { RenderedRoot } from "./root.js";
import { TIMELINE } from "../core/timeline/timeline.js";
export class Root {
    static jsdom(jsdom) {
        return Root.environment(DomEnvironment.jsdom(jsdom), `#<Universe jsdom>`);
    }
    /**
     * Create a new timeline in order to manage outputs using SimpleDOM. It's safe
     * to use SimpleDOM with the real DOM as long as you don't need runtime
     * features like event handlers and dynamic properties.
     */
    static environment(environment, description = `#<Universe>`) {
        return new Root(environment, [], description);
    }
    [INSPECT]() {
        return this.#description;
    }
    #environment;
    #children;
    #description;
    dom = new ReactiveDOM();
    on = {
        advance: (callback) => TIMELINE.on.advance(callback),
    };
    constructor(document, children, description) {
        this.#environment = document;
        this.#children = children;
        this.#description = description;
    }
    use(hook, { into }) {
        let node = HookProgramNode.create(this, hook);
        return this.build(node, {
            cursor: HookCursor.create(),
            hydrate: () => into,
        });
    }
    render(node, { append }) {
        return this.build(node, {
            cursor: TreeConstructor.html(this.#environment),
            hydrate: (buffer) => {
                buffer.replace(this.#appending(append));
                return minimize(append);
            },
        });
    }
    build(node, { cursor, hydrate, }) {
        let rendered = node.render(cursor);
        let container = hydrate(cursor);
        let root = RenderedRoot.create({
            rendered,
            container,
        });
        LIFETIME.link(root, rendered);
        return root;
    }
    #appending(parent) {
        let placeholder = MINIMAL.element(this.#environment.document, parent, "template");
        DOM.insert(placeholder, DOM.appending(parent));
        return placeholder;
    }
}
//# sourceMappingURL=universe.js.map