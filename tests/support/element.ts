import type {
  AttributeName,
  BuildAttribute,
  ContentProgramNode,
  ReactiveElementBuilderCallback,
  Root,
} from "@starbeam/dom";
import { Reactive, type IntoReactive } from "@starbeam/reactive";
import type { Expects } from "./expect/expect.js";

interface ShorthandAttribute {
  name: AttributeName;
  value: string | null;
}

type TestAttribute =
  // { href: { prefix: Prefix.xlink, value: Reactive.static("<url>") } }
  | BuildAttribute
  // { title: { value: "Chirag" } }
  // { href: { prefix: "xlink", value: "<url>" } } or
  // { href: { prefix: "xlink", value: Reactive.static("<url>") }
  | ShorthandAttribute
  // { title: "Chirag" } or { title: Reactive.static("Chirag") }
  | IntoReactive<string | null>;

export function isIntoReactive(
  value: TestAttribute
): value is IntoReactive<string | null> {
  if (Reactive.is(value)) {
    return true;
  } else if (value === null || typeof value === "string") {
    return true;
  } else {
    return false;
  }
}

export function isReactiveAttribute(
  attribute: BuildAttribute | ShorthandAttribute
): attribute is BuildAttribute {
  return Reactive.is(attribute.value);
}

export type TestChild = ContentProgramNode | string;

export interface TestElementOptions {
  attributes?: Record<string, TestAttribute>;
  children?: readonly TestChild[];
}

export class ElementArgs {
  static normalize(
    universe: Root,
    options: TestElementArgs
  ): NormalizedTestElementArgs {
    return new ElementArgs(universe).#normalizeElementArgs(options);
  }

  constructor(readonly universe: Root) {}

  #normalizeElementArgs(args: TestElementArgs): NormalizedTestElementArgs {
    if (isNormalized(args)) {
      let [tagName, callback, expectation] = args;
      return { tagName, build: callback, expectation };
    } else {
      let [intoTagName, intoOptions, expectation] = args;

      let tagName = Reactive.from(intoTagName);
      let build = this.#normalizeOptions(intoOptions);

      return { tagName, build, expectation };
    }
  }

  #normalizeOptions({
    attributes,
    children,
  }: TestElementOptions): BuilderCallback {
    let normalizedChildren =
      children?.map((c) => normalizeChild(this.universe, c)) ?? [];
    let normalizedAttributes = attributes
      ? Object.entries(attributes).map((a) => this.#normalizeAttribute(a))
      : [];

    return (b) => {
      for (let attribute of normalizedAttributes) {
        b.attribute(attribute);
      }

      for (let child of normalizedChildren) {
        b.append(child);
      }
    };
  }

  #normalizeAttribute([name, attribute]: [
    name: string,
    attribute: TestAttribute
  ]): BuildAttribute {
    if (isIntoReactive(attribute)) {
      let value = Reactive.from(attribute);
      return { name: name as AttributeName, value };
    } else if (isReactiveAttribute(attribute)) {
      return attribute;
    } else {
      let { name, value } = attribute;

      return {
        name,
        value: Reactive.from(value),
      };
    }
  }
}

export function normalizeChild(
  this: void,
  universe: Root,
  child: TestChild
): ContentProgramNode {
  if (typeof child === "string") {
    return universe.dom.text(Reactive.from(child));
  } else {
    return child;
  }
}

export type BuilderCallback = ReactiveElementBuilderCallback;
export type TagName = Reactive<string>;

type BuilderElementArgs = [
  tagName: TagName,
  callback: BuilderCallback,
  expectation: Expects
];

type ShorthandElementArgs = [
  tagName: IntoReactive<string>,
  options: TestElementOptions,
  expectation: Expects
];

export type TestElementArgs = BuilderElementArgs | ShorthandElementArgs;

function isNormalized(args: TestElementArgs): args is BuilderElementArgs {
  return typeof args[1] === "function";
}

export type NormalizedTestElementArgs = {
  tagName: Reactive<string>;
  build: BuilderCallback;
  expectation: Expects;
};
