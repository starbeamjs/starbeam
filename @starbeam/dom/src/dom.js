import { Reactive } from "@starbeam/core";
import { CommentProgramNode, TextProgramNode } from "./program-node/data.js";
import { ElementProgramNode, ElementProgramNodeBuilder, } from "./program-node/element.js";
import { FragmentProgramNode, FragmentProgramNodeBuilder, } from "./program-node/fragment.js";
import { Loop } from "./program-node/list/loop.js";
export const APPEND = Symbol("APPEND");
export class ReactiveDOM {
    text(data) {
        return TextProgramNode.of(data);
    }
    comment(data) {
        return CommentProgramNode.of(data);
    }
    element(tagName, callback) {
        let builder = new ElementProgramNodeBuilder(Reactive.from(tagName));
        if (callback) {
            callback(builder);
            return builder.finalize();
        }
        else {
            return builder;
        }
    }
    fragment(build) {
        return FragmentProgramNodeBuilder.build(build);
    }
    list(iterable, component, key) {
        return Loop.from(iterable, component, key).list();
    }
}
export * from "./dom/buffer/attribute.js";
export * from "./dom/buffer/body.js";
export * from "./dom/environment.js";
//# sourceMappingURL=dom.js.map