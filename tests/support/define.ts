import type { minimal } from "@domtree/flavors";
import { JSDOM } from "jsdom";
import {
  Cell,
  CommentProgramNode,
  ContentProgramNode,
  DomEnvironment,
  ElementProgramNode,
  ElementProgramNodeBuilder,
  FragmentProgramNode,
  HTML_NAMESPACE,
  is,
  Reactive,
  ReactiveDOM,
  ReactiveMetadata,
  RenderedRoot,
  TextProgramNode,
  Universe,
  verify,
} from "starbeam";
import { upstream } from "../jest-ext";
import {
  ElementArgs,
  normalizeChild,
  TestChild,
  TestElementArgs,
} from "./element";
import { expect, Expects } from "./expect/expect";
import { toBe } from "./expect/patterns/comparison";

export interface TestArgs {
  readonly universe: Universe;
  readonly test: TestSupport;
  readonly dom: ReactiveDOM;
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

export function todo(
  name: string,
  test: (args: TestArgs) => void | Promise<void>
): void {
  upstream.test(name, async () => {
    let support = TestSupport.create();

    try {
      await test({
        test: support,
        universe: support.universe,
        dom: support.dom,
      });
    } catch (e) {
      return;
    }

    throw Error(`Expected pending test '${name}' to fail, but it passed`);
  });

  upstream.test.todo(name);
}

export class TestRoot {
  static create(root: RenderedRoot, container: minimal.Element): TestRoot {
    return new TestRoot(root, container);
  }

  readonly #root: RenderedRoot;
  readonly #container: minimal.Element;

  private constructor(root: RenderedRoot, container: minimal.Element) {
    this.#root = root;
    this.#container = container;
  }

  poll(): void {
    this.#root.poll();
  }

  update<T>(
    [cell, value]: [cell: Cell<T>, value: T],
    expectation: Expects
  ): this;
  update(updater: () => void, expectation: Expects): this;
  update<T>(
    updater: [cell: Cell<T>, value: T] | (() => void),
    expectation: Expects
  ): this {
    if (typeof updater === "function") {
      updater();
    } else {
      let [cell, value] = updater;
      cell.update(value);
    }

    this.#root.poll();
    this.#root.initialize();

    expectation.assertDynamism(this.#root.metadata);

    expectation.assertContents(this.#container.innerHTML);
    return this;
  }
}

export class TestSupport {
  static create(jsdom = new JSDOM()): TestSupport {
    return new TestSupport(DomEnvironment.jsdom(jsdom));
  }

  readonly universe: Universe;
  readonly dom: ReactiveDOM;

  readonly #environment: DomEnvironment;

  private constructor(environment: DomEnvironment) {
    this.#environment = environment;
    this.universe = Universe.environment(environment);
    this.dom = this.universe.dom;
  }

  buildText(
    reactive: Reactive<string>,
    expectation: ReactiveMetadata
  ): TextProgramNode {
    let text = this.universe.dom.text(reactive);
    expect(text.metadata, toBe(expectation));
    return text;
  }

  buildComment(
    reactive: Reactive<string>,
    expectation: ReactiveMetadata
  ): CommentProgramNode {
    let comment = this.universe.dom.comment(reactive);
    expect(comment.metadata, toBe(expectation));
    return comment;
  }

  buildElement(...args: TestElementArgs): ElementProgramNode {
    let { tagName, build, expectation } = ElementArgs.normalize(
      this.universe,
      args
    );
    let element = ElementProgramNodeBuilder.build(tagName, build);
    expect(element.metadata, toBe(expectation.dynamism));

    return element;
  }

  buildFragment(
    children: readonly TestChild[],
    expectation: Expects
  ): FragmentProgramNode {
    let fragment = this.dom.fragment((b) => {
      for (let child of children) {
        b.append(normalizeChild(this.universe, child));
      }
    });

    expect(fragment.metadata, toBe(expectation.dynamism));

    return fragment;
  }

  render(node: ContentProgramNode, expectation: Expects): TestRoot {
    let element = this.#environment.document.createElementNS(
      HTML_NAMESPACE,
      "div"
    );
    let result = this.universe.render(node, { append: element });

    verify(result, is.Present);

    expect(
      result.metadata,
      toBe(expectation.dynamism, {
        actual: result.metadata.describe(),
        expected: expectation.dynamism.describe(),
      })
    );

    // Exchange markers for DOM representations to allow us to compare the DOM
    // without markers to our expectations.
    result.initialize();

    expectation.assertContents(element.innerHTML);

    // ensure that a noop poll doesn't change the HTML output
    result.poll();

    expectation.assertContents(element.innerHTML);

    return TestRoot.create(result, element);
  }

  // update<T>(rendered: RenderedRoot, cell: Cell<T>, value: T): void {
  //   cell.update(value);

  //   rendered.poll();
  //   rendered.initialize();
  // }
}

export type Test = (args: {
  test: TestSupport;
  universe: Universe;
}) => void | Promise<void>;

export { expect } from "./expect/expect";
export { toBe } from "./expect/patterns";
