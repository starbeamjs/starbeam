import type { TreeConstructor } from "../dom/streaming/tree-constructor";
import { ReactiveParameter } from "../reactive/parameter";
import type { Dehydrated } from "./hydrator/hydrate-node";
import type {
  AbstractContentProgramNode,
  BuildMetadata,
  ProgramNode,
  RenderedContent,
  RenderedContentMetadata,
} from "./program-node";

type AbstractComponent<
  P extends ReactiveParameter,
  R extends RenderedContent
> = (arg: P) => AbstractContentProgramNode<R>;

export type Component<
  P extends ReactiveParameter = ReactiveParameter,
  R extends RenderedContent = RenderedContent
> = AbstractComponent<P, R>;

export type ComponentNodeType<C extends (arg: any) => ProgramNode> = C extends (
  arg: any
) => ProgramNode<infer N>
  ? N
  : never;

export class ComponentInvocation implements ProgramNode<RenderedComponent> {
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
  // @ts-expect-error TODO: Implement ComponentInvocation
  readonly #output: ProgramNode;

  private constructor(output: ProgramNode, metadata: BuildMetadata) {
    this.#output = output;
    this.metadata = metadata;
  }

  render(_buffer: TreeConstructor): Dehydrated<RenderedComponent> | null {
    throw Error("todo: ComponentInvocation#render");
  }
}

export class RenderedComponent implements RenderedContent {
  static of(rendered: RenderedContent): RenderedComponent {
    return new RenderedComponent(rendered);
  }

  readonly #rendered: RenderedContent;

  constructor(rendered: RenderedContent) {
    this.#rendered = rendered;
  }

  get metadata(): RenderedContentMetadata {
    return this.#rendered.metadata;
  }

  poll(): void {
    this.#rendered.poll();
  }
}
