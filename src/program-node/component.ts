import type { TreeConstructor } from "../dom/streaming/tree-constructor";
import { ReactiveParameter } from "../reactive/parameter";
import type {
  BuildMetadata,
  ContentProgramNode,
  ProgramNode,
} from "./interfaces/program-node";
import type { RenderedContent } from "./interfaces/rendered-content";

export type Component<
  P extends ReactiveParameter = ReactiveParameter,
  R extends RenderedContent = RenderedContent
> = (arg: P) => ContentProgramNode<R>;

export type ComponentNodeType<C extends (arg: any) => ProgramNode> = C extends (
  arg: any
) => ProgramNode<infer N>
  ? N
  : never;

export class ComponentInvocation implements ProgramNode<RenderedContent> {
  static invoke<P extends ReactiveParameter>(
    component: Component<P>,
    parameter: P
  ): ComponentInvocation {
    let isStatic = ReactiveParameter.isStatic(parameter);

    return new ComponentInvocation(component(parameter), {
      isStatic,
    });
  }

  readonly metadata: BuildMetadata;
  readonly #node: ContentProgramNode;

  private constructor(output: ContentProgramNode, metadata: BuildMetadata) {
    this.#node = output;
    this.metadata = metadata;
  }

  render(buffer: TreeConstructor): RenderedContent | null {
    return this.#node.render(buffer);
  }
}
