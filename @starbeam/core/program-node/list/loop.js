import { RangeSnapshot, RANGE_SNAPSHOT } from "../../dom/streaming/cursor.js";
import { ContentConstructor, TOKEN, TreeConstructor, } from "../../dom/streaming/tree-constructor.js";
import { ReactiveMetadata } from "../../core/metadata.js";
import { verified } from "../../strippable/assert.js";
import { is } from "../../strippable/minimal.js";
import { as } from "../../strippable/verify-context.js";
import { NonemptyList } from "../../utils.js";
import { OrderedIndex } from "../../utils/index-map.js";
import { RenderedCharacterData } from "../data.js";
import { ContentProgramNode } from "../interfaces/program-node.js";
import { RenderedContent } from "../interfaces/rendered-content.js";
import { ListArtifacts } from "./diff.js";
import { KeyedContent, RenderSnapshot } from "./snapshot.js";
import { Reactive } from "../../reactive/reactive.js";
export class StaticLoop {
    static create(iterable, component, key) {
        return new StaticLoop([...iterable], key, component);
    }
    #list;
    #key;
    #component;
    constructor(list, key, component) {
        this.#list = list;
        this.#key = key;
        this.#component = component;
    }
    get metadata() {
        return ReactiveMetadata.all(...this.#list);
    }
    *[Symbol.iterator]() {
        for (let item of this.#list) {
            yield KeyedProgramNode.component(this.#component, item, this.#key);
        }
    }
    list() {
        return StaticListProgramNode.of(this);
    }
}
export class KeyedProgramNode extends ContentProgramNode {
    key;
    static component(component, arg, key) {
        let node = component(arg);
        return new KeyedProgramNode(node, key);
    }
    static render(node, buffer) {
        let content = node.render(buffer);
        return KeyedContent.create(node.key, content);
    }
    #node;
    constructor(node, key) {
        super();
        this.key = key;
        this.#node = node;
    }
    get metadata() {
        return this.#node.metadata;
    }
    render(buffer) {
        return this.#node.render(buffer);
    }
}
export class CurrentLoop {
    static create(list, component, key) {
        let index = OrderedIndex.create([...list], key);
        return new CurrentLoop(index, component);
    }
    #index;
    #component;
    constructor(index, component) {
        this.#index = index;
        this.#component = component;
    }
    *[Symbol.iterator]() {
        for (let [key, arg] of this.#index.entries()) {
            yield KeyedProgramNode.component(this.#component, arg, key);
        }
    }
    isEmpty() {
        return this.#index.list.length === 0;
    }
    get keys() {
        return this.#index.keys;
    }
    get(key) {
        let arg = this.#index.get(key);
        if (arg === null) {
            return null;
        }
        return KeyedProgramNode.component(this.#component, arg, key);
    }
}
export class DynamicLoop {
    static create(iterable, component, key) {
        return new DynamicLoop(iterable, component, key);
    }
    #iterable;
    #component;
    #key;
    constructor(iterable, component, key) {
        this.#iterable = iterable;
        this.#component = component;
        this.#key = key;
    }
    get(parameter) {
        return KeyedProgramNode.component(this.#component, parameter, this.#key);
    }
    get metadata() {
        // TODO: Track this over time
        return ReactiveMetadata.Dynamic;
    }
    get current() {
        return CurrentLoop.create(this.#iterable.current, this.#component, this.#key);
    }
    list() {
        return DynamicListProgramNode.of(this);
    }
}
export const Loop = {
    from: (iterable, component, key) => {
        if (iterable.isConstant()) {
            return StaticLoop.create(iterable.current, component, key);
        }
        else {
            return DynamicLoop.create(iterable, component, key);
        }
    },
};
/**
 * The input for a `StaticListProgramNode` is a static iterable. It is static if all
 * of the elements of the iterable are also static.
 */
export class StaticListProgramNode extends ContentProgramNode {
    static of(loop) {
        return new StaticListProgramNode([...loop], loop);
    }
    #components;
    #loop;
    constructor(components, loop) {
        super();
        this.#components = components;
        this.#loop = loop;
    }
    get metadata() {
        return this.#loop.metadata;
    }
    render(buffer) {
        let content = [];
        let isConstant = true;
        for (let component of this.#components) {
            let rendered = component.render(buffer);
            isConstant = isConstant && RenderedContent.isConstant(rendered);
            content.push(KeyedContent.create(component.key, rendered));
        }
        if (content.length === 0) {
            return RenderedCharacterData.create(Reactive.from(""), buffer.comment("", TOKEN).dom);
        }
        else {
            return RenderedStaticList.create(RenderSnapshot.of(NonemptyList.verified(content)), isConstant ? ReactiveMetadata.Constant : ReactiveMetadata.Dynamic);
        }
    }
}
export class RenderedStaticList extends RenderedContent {
    static create(artifacts, metadata) {
        return new RenderedStaticList(artifacts, metadata);
    }
    metadata;
    #artifacts;
    constructor(artifacts, metadata) {
        super();
        this.#artifacts = artifacts;
        this.metadata = metadata;
    }
    [RANGE_SNAPSHOT](parent) {
        let [start, end] = verified(this.#artifacts.boundaries, is.Present, as(`artifact boundaries`).when(`the list is a RenderedStaticList`));
        return RangeSnapshot.forContent(parent, start.content, end.content);
    }
    initialize(inside) {
        this.#artifacts.initialize(inside);
    }
    poll(inside) {
        this.#artifacts.poll(inside);
    }
}
export class DynamicListProgramNode extends ContentProgramNode {
    static of(loop) {
        return new DynamicListProgramNode(loop);
    }
    #loop;
    constructor(loop) {
        super();
        this.#loop = loop;
    }
    get metadata() {
        return this.#loop.metadata;
    }
    render(buffer) {
        let { range, result: contents } = buffer.fragment((buffer) => {
            return [...this.#loop.current].map((keyed) => {
                let rendered = keyed.render(buffer);
                return KeyedContent.create(keyed.key, rendered);
            });
        });
        return RenderedDynamicList.create(this.#loop, ListArtifacts.create(ReactiveMetadata.Dynamic, RenderSnapshot.from(contents)), range.dom, ReactiveMetadata.Dynamic);
    }
}
class Fragment {
    static of(lazy) {
        return new Fragment(lazy, undefined);
    }
    #lazy;
    #placeholder;
    constructor(lazy, placeholder) {
        this.#lazy = lazy;
        this.#placeholder = placeholder;
    }
    get environment() {
        return this.#lazy.environment;
    }
    initialize(inside) {
        this.#lazy.get(inside);
    }
    get(inside) {
        if (this.#placeholder === undefined) {
            this.#placeholder = verified(this.#lazy.get(inside).asNode(), is.Comment, as(`the ContentRange for a rendered list`).when(`the list was empty`));
        }
        return verified(this.#placeholder, is.Present, as(`The ContentRange for a rendered list`).when(`the list was empty`));
    }
    set(placeholder) {
        this.#placeholder = placeholder;
    }
}
export class RenderedDynamicList extends RenderedContent {
    metadata;
    static create(loop, artifacts, fragment, metadata) {
        return new RenderedDynamicList(loop, artifacts, Fragment.of(fragment), metadata);
    }
    #loop;
    #artifacts;
    #fragment;
    constructor(loop, artifacts, fragment, metadata) {
        super();
        this.metadata = metadata;
        this.#loop = loop;
        this.#artifacts = artifacts;
        this.#fragment = fragment;
    }
    [RANGE_SNAPSHOT](parent) {
        let boundaries = this.#artifacts.boundaries;
        if (boundaries) {
            let [start, end] = boundaries;
            return RangeSnapshot.forContent(parent, start.content, end.content);
        }
        else {
            let placeholder = this.#fragment.get(parent);
            return RangeSnapshot.create(this.#fragment.environment, placeholder);
        }
    }
    initialize(inside) {
        this.#fragment.initialize(inside);
        this.#artifacts.initialize(inside);
    }
    poll(inside) {
        let placeholder = this.#artifacts.poll(this.#loop.current, inside, this[RANGE_SNAPSHOT](inside));
        if (placeholder === undefined) {
            return;
        }
        else {
            this.#fragment.set(placeholder);
        }
    }
}
//# sourceMappingURL=loop.js.map