import { HasMetadata, ReactiveMetadata } from "../core/metadata.js";
import type { ExtendsReactive } from "../reactive/base.js";
export declare type OutputBuilder<In, Out> = (input: ExtendsReactive<In>) => Out;
export declare abstract class RenderedProgramNode<Container> extends HasMetadata {
    abstract initialize(inside: Container): void;
    abstract poll(inside: Container): void;
}
export declare abstract class AbstractProgramNode<Cursor, Container> extends HasMetadata {
    isConstant(): boolean;
    isDynamic(): boolean;
    abstract get metadata(): ReactiveMetadata;
    abstract render(cursor: Cursor): RenderedProgramNode<Container>;
}
export declare type ProgramNode<Cursor = unknown, Container = unknown> = AbstractProgramNode<Cursor, Container>;
//# sourceMappingURL=program-node.d.ts.map