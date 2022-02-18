import type { minimal } from "@domtree/flavors";
import type { ContentRange } from "../../dom/streaming/compatible-dom.js";
import { RangeSnapshot, RANGE_SNAPSHOT } from "../../dom/streaming/cursor.js";
import type { LazyDOM } from "../../dom/streaming/token.js";
import { ContentConstructor, TreeConstructor } from "../../dom/streaming/tree-constructor.js";
import { ReactiveMetadata } from "../../core/metadata.js";
import type { ReactiveParameter } from "../../reactive/parameter.js";
import { OrderedIndex } from "../../utils/index-map.js";
import type { Component } from "../component.js";
import { ContentProgramNode } from "../interfaces/program-node.js";
import { RenderedContent } from "../interfaces/rendered-content.js";
import { ListArtifacts } from "./diff.js";
import { KeyedContent, RenderSnapshot } from "./snapshot.js";
import { Reactive } from "../../reactive/reactive.js";
export declare type ListProgramNode = StaticListProgramNode | DynamicListProgramNode;
export declare class StaticLoop {
    #private;
    static create<P extends ReactiveParameter>(iterable: Iterable<P>, component: Component<P>, key: Key<P>): StaticLoop;
    private constructor();
    get metadata(): ReactiveMetadata;
    [Symbol.iterator](): IterableIterator<KeyedProgramNode>;
    list(): StaticListProgramNode;
}
export declare type Key<P extends ReactiveParameter> = (input: P) => unknown;
export declare type AnyKey = Key<ReactiveParameter>;
export declare class KeyedProgramNode extends ContentProgramNode {
    #private;
    readonly key: unknown;
    static component<P extends ReactiveParameter>(component: Component<P>, arg: P, key: unknown): KeyedProgramNode;
    static render(node: KeyedProgramNode, buffer: ContentConstructor): KeyedContent;
    private constructor();
    get metadata(): ReactiveMetadata;
    render(buffer: ContentConstructor): RenderedContent;
}
export declare class CurrentLoop implements Iterable<KeyedProgramNode> {
    #private;
    static create(list: Iterable<ReactiveParameter>, component: Component, key: AnyKey): CurrentLoop;
    constructor(index: OrderedIndex<unknown, ReactiveParameter>, component: Component);
    [Symbol.iterator](): IterableIterator<KeyedProgramNode>;
    isEmpty(): boolean;
    get keys(): readonly unknown[];
    get(key: unknown): KeyedProgramNode | null;
}
export declare class DynamicLoop {
    #private;
    static create<P extends ReactiveParameter>(iterable: Reactive<Iterable<P>>, component: Component<P>, key: Key<P>): DynamicLoop;
    constructor(iterable: Reactive<Iterable<ReactiveParameter>>, component: Component, key: AnyKey);
    get(parameter: ReactiveParameter): KeyedProgramNode;
    get metadata(): ReactiveMetadata;
    get current(): CurrentLoop;
    list(): DynamicListProgramNode;
}
export declare type Loop = StaticLoop | DynamicLoop;
export declare const Loop: {
    readonly from: <P extends ReactiveParameter>(iterable: Reactive<Iterable<P>>, component: Component<P>, key: (input: P) => unknown) => Loop;
};
/**
 * The input for a `StaticListProgramNode` is a static iterable. It is static if all
 * of the elements of the iterable are also static.
 */
export declare class StaticListProgramNode extends ContentProgramNode {
    #private;
    static of(loop: StaticLoop): StaticListProgramNode;
    constructor(components: readonly KeyedProgramNode[], loop: StaticLoop);
    get metadata(): ReactiveMetadata;
    render(buffer: TreeConstructor): RenderedContent;
}
export declare type ContentsIndex = OrderedIndex<unknown, KeyedContent>;
export declare class RenderedStaticList extends RenderedContent {
    #private;
    static create(artifacts: RenderSnapshot, metadata: ReactiveMetadata): RenderedStaticList;
    readonly metadata: ReactiveMetadata;
    constructor(artifacts: RenderSnapshot, metadata: ReactiveMetadata);
    [RANGE_SNAPSHOT](parent: minimal.ParentNode): RangeSnapshot;
    initialize(inside: minimal.ParentNode): void;
    poll(inside: minimal.ParentNode): void;
}
export declare class DynamicListProgramNode extends ContentProgramNode {
    #private;
    static of(loop: DynamicLoop): DynamicListProgramNode;
    constructor(loop: DynamicLoop);
    get metadata(): ReactiveMetadata;
    render(buffer: TreeConstructor): RenderedDynamicList;
}
export declare class RenderedDynamicList extends RenderedContent {
    #private;
    readonly metadata: ReactiveMetadata;
    static create(loop: DynamicLoop, artifacts: ListArtifacts, fragment: LazyDOM<ContentRange>, metadata: ReactiveMetadata): RenderedDynamicList;
    private constructor();
    [RANGE_SNAPSHOT](parent: minimal.ParentNode): RangeSnapshot;
    initialize(inside: minimal.ParentNode): void;
    poll(inside: minimal.ParentNode): void;
}
