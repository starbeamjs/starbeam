import { createDocument, HTMLSerializer, voidMap } from "simple-dom";
import { upstream } from "../jest-ext";
import { ElementArgs, TestElementArgs } from "./element";
import { Expects } from "./expect/expect";
import {
  Cell,
  dom,
  HydratedTokens,
  Reactive,
  ReactiveDOM,
  ReactiveElementBuilder,
  SimpleDomTypes,
  Token,
  TreeHydrator,
  Universe,
  minimal,
} from "./starbeam";
import { JSDOM } from "jsdom";

export interface TestArgs {
  readonly universe: TestUniverse;
  readonly test: TestSupport;
  readonly dom: ReactiveDOM<SimpleDomTypes>;
}

export function test(
  name: string,
  test: (args: TestArgs) => void | Promise<void>
): void {
  upstream.test(name, () => {
    let support = TestSupport.create();

    return test({
      test: support,
      universe: support.universe,
      dom: support.dom,
    }) as Promise<unknown>;
  });
}

export type TestUniverse = Universe<SimpleDomTypes>;
export type TestDOM = ReactiveDOM<SimpleDomTypes>;

export class TestSupport {
  static create(document = new JSDOM()): TestSupport {
    return new TestSupport(document);
  }

  readonly universe: TestUniverse;
  readonly dom: TestDOM;

  #document: minimal.Document;

  private constructor(document: minimal.Document) {
    this.#document = document;
    this.universe = Universe.simpleDOM(document);
    this.dom = this.universe.dom;
  }

  buildText(reactive: Reactive<string>, expectation: Expects): TextProgramNode {
    let text = this.universe.dom.text(reactive);
    expect(normalize(text.metadata.isStatic)).toBe(expectation);
    return text;
  }

  buildComment(
    reactive: Reactive<string>,
    expectation: Expects
  ): CommentProgramNode {
    let comment = this.universe.dom.comment(reactive);
    expect(normalize(comment.metadata.isStatic)).toBe(expectation);
    return comment;
  }

  buildElement(...args: TestElementArgs): ElementProgramNode {
    let { tagName, build, expectation } = ElementArgs.normalize(
      this.universe,
      args
    );
    let element = ReactiveElementBuilder.build(tagName, build);
    expect(normalize(element.metadata.isStatic)).toBe(expectation);
    return element;
  }

  hydrate(
    fragment: dom.CompatibleDocumentFragment,
    tokens: Set<Token>
  ): HydratedTokens {
    return TreeHydrator.hydrate(this.#document, fragment, tokens);
  }

  render<O extends TestOutput<N>, N extends Simple.Node>(
    output: O,
    expectation: Expects
  ): {
    result: TestRendered<N>;
    into: Simple.Element;
  } {
    let element = this.#document.createElement("div");
    let result = this.universe.renderIntoElement(output, element);

    expect(
      normalize(result.metadata.isConstant),
      `Render should produce ${expectation} output.`
    ).toBe(expectation);

    return { result, into: element };
  }

  update<T>(rendered: AnyTestRendered, cell: Cell<T>, value: T): void {
    cell.update(value);
    this.universe.poll(rendered);
  }
}

export type Test = (args: {
  test: TestSupport;
  universe: Universe;
}) => void | Promise<void>;

function normalize(isStatic: boolean): Expects {
  return isStatic ? Expects.static : Expects.dynamic;
}

export function innerHTML(element: Simple.Element): string {
  let serializer = new HTMLSerializer(voidMap);
  return serializer.serializeChildren(element);
}

export function outerHTML(element: Simple.Element): string {
  let serializer = new HTMLSerializer(voidMap);
  return serializer.serialize(element);
}

export { expect } from "./expect/expect";
export { toBe } from "./expect/patterns";
