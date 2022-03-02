import type { minimal } from "@domtree/flavors";
import * as jest from "@jest/globals";
import { is, RenderedRoot } from "@starbeam/core";
import { Abstraction } from "@starbeam/debug";
import {
  DomEnvironment,
  ElementProgramNodeBuilder,
  HTML_NAMESPACE,
  ReactiveDOM,
  Root,
  type CommentProgramNode,
  type ContentProgramNode,
  type ElementProgramNode,
  type FragmentProgramNode,
  type TextProgramNode,
} from "@starbeam/dom";
import type { Cell, ReactiveValue } from "@starbeam/reactive";
import { verify } from "@starbeam/verify";
import { JSDOM } from "jsdom";
import {
  ElementArgs,
  normalizeChild,
  type TestChild,
  type TestElementArgs,
} from "./element.js";
import { Dynamism, expect, Expects } from "./expect/expect.js";
import { toBe } from "./expect/patterns/comparison.js";

export interface TestArgs {
  readonly universe: Root;
  readonly test: TestSupport;
  readonly dom: ReactiveDOM;
}

export function test(
  name: string,
  test: (args: TestArgs) => void | Promise<void>
): void {
  jest.test.concurrent(name, () => {
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
  test?: (args: TestArgs) => void | Promise<void>
): void {
  if (test) {
    jest.test.concurrent(name, async () => {
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
  }

  jest.test.todo(name);
}

export class TestRoot {
  static create(
    root: RenderedRoot<minimal.ParentNode>,
    container: minimal.Element
  ): TestRoot {
    return new TestRoot(root, container);
  }

  readonly #root: RenderedRoot<minimal.ParentNode>;
  readonly #container: minimal.Element;

  private constructor(
    root: RenderedRoot<minimal.ParentNode>,
    container: minimal.Element
  ) {
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
      const [cell, value] = updater;
      cell.current = value;
    }

    this.#root.poll();
    this.#root.initialize();

    Abstraction.throws(() => {
      expectation.assertDynamism(this.#root);

      expectation.assertContents(this.#container.innerHTML);
    }, 3);

    return this;
  }
}

export class TestSupport {
  static create(jsdom = new JSDOM()): TestSupport {
    return new TestSupport(DomEnvironment.jsdom(jsdom));
  }

  readonly universe: Root;
  readonly dom: ReactiveDOM;

  readonly #environment: DomEnvironment;

  private constructor(environment: DomEnvironment) {
    this.#environment = environment;
    this.universe = Root.environment(environment);
    this.dom = this.universe.dom;
  }

  buildText(
    reactive: ReactiveValue<string>,
    expectation: Dynamism
  ): TextProgramNode {
    let text = this.universe.dom.text(reactive);
    Abstraction.throws(() => {
      expect(Dynamism.from(text), toBe(expectation));
    }, 3);
    return text;
  }

  buildComment(
    reactive: ReactiveValue<string>,
    expectation: Dynamism
  ): CommentProgramNode {
    let comment = this.universe.dom.comment(reactive);
    expect(Dynamism.from(comment), toBe(expectation));
    return comment;
  }

  buildElement(...args: TestElementArgs): ElementProgramNode {
    let { tagName, build, expectation } = ElementArgs.normalize(
      this.universe,
      args
    );
    let element = ElementProgramNodeBuilder.build(tagName, build);
    expect(Dynamism.from(element), toBe(expectation.dynamism));

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

    expect(Dynamism.from(fragment), toBe(expectation.dynamism));

    return fragment;
  }

  render(node: ContentProgramNode, expectation: Expects): TestRoot {
    let element = this.#environment.document.createElementNS(
      HTML_NAMESPACE,
      "div"
    );
    let result = this.universe.render(node, { append: element });

    verify(result, is.Present);

    if (expectation.dynamism === null) {
      throw Error(
        `The expectation passed to render() must include dynamism (either .constant or .dynamic)`
      );
    }

    expect(
      Dynamism.from(result),
      toBe(expectation.dynamism, (value) => value.describe())
    );

    // Exchange markers for DOM representations to allow us to compare the DOM
    // without markers to our expectations.
    result.initialize();

    Abstraction.wrap(() => {
      expectation.assertContents(element.innerHTML);
    }, 3);

    // ensure that a noop poll doesn't change the HTML output
    result.poll();

    Abstraction.wrap(() => {
      expectation.assertContents(element.innerHTML);
    }, 3);

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
  universe: Root;
}) => void | Promise<void>;

export { expect } from "./expect/expect.js";
export { toBe } from "./expect/patterns.js";
