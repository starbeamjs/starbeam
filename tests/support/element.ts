import * as starbeam from "../../src/index";
import { TestTimeline } from "./index";
import { Expects } from "./expect/expect";

interface ShorthandAttribute {
  prefix?: "xml" | "xmlns" | "xlink";
  value: starbeam.IntoReactive<string | null>;
}

type TestAttribute =
  | starbeam.ReactiveAttribute
  | ShorthandAttribute
  | starbeam.IntoReactive<string | null>;

function isObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

export function isIntoReactive(
  value: TestAttribute
): value is starbeam.IntoReactive<string | null> {
  if (starbeam.Reactive.isReactive(value)) {
    return true;
  } else if (value === null || typeof value === "string") {
    return true;
  } else {
    return false;
  }
}

export function isReactiveAttribute(
  attribute: starbeam.ReactiveAttribute | ShorthandAttribute
): attribute is starbeam.ReactiveAttribute {
  let { value, prefix } = attribute;

  if (typeof prefix === "string") {
    return false;
  }

  return starbeam.Reactive.isReactive(value);
}

export function intoReactiveAttribute(
  name: string,
  { prefix: intoPrefix, value: intoValue }: ShorthandAttribute
): starbeam.ReactiveAttribute {
  let prefix =
    intoPrefix === undefined ? undefined : starbeam.intoPrefix(intoPrefix);
  let value = starbeam.Reactive.from(intoValue);

  return { name, prefix, value };
}

export type AnyOutput = starbeam.AnyOutput<starbeam.SimpleDomTypes>;
export type TestChild = AnyOutput | string;

export interface TestElementOptions {
  attributes: Record<string, TestAttribute>;
  children: readonly TestChild[];
}

export class ElementArgs {
  static normalize(
    timeline: TestTimeline,
    options: TestElementArgs
  ): NormalizedTestElementArgs {
    return new ElementArgs(timeline).#normalizeElementArgs(options);
  }

  constructor(readonly timeline: TestTimeline) {}

  #normalizeElementArgs(args: TestElementArgs): NormalizedTestElementArgs {
    if (isNormalized(args)) {
      let [tagName, callback, expectation] = args;
      return { tagName, build: callback, expectation };
    } else {
      let [intoTagName, intoOptions, expectation] = args;

      let tagName = starbeam.Reactive.from(intoTagName);
      let build = this.#normalizeOptions(intoOptions);

      return { tagName, build, expectation };
    }
  }

  #normalizeOptions({
    attributes,
    children,
  }: TestElementOptions): BuilderCallback {
    let normalizedChildren = children.map((c) => this.#normalizeChild(c));
    let normalizedAttributes = Object.entries(attributes).map((a) =>
      this.#normalizeAttribute(a)
    );

    return (b) => {
      for (let attribute of normalizedAttributes) {
        b.attribute(attribute);
      }

      for (let child of normalizedChildren) {
        b.append(child);
      }
    };
  }

  #normalizeChild(child: TestChild): AnyOutput {
    throw Error("unimplemented");
  }

  #normalizeAttribute([name, attribute]: [
    name: string,
    attribute: TestAttribute
  ]): starbeam.ReactiveAttribute {
    if (isIntoReactive(attribute)) {
      let value = starbeam.Reactive.from(attribute);
      return { name, value };
    } else if (isReactiveAttribute(attribute)) {
      return attribute;
    } else {
      return intoReactiveAttribute(name, attribute);
    }
  }
}

export type BuilderCallback =
  starbeam.ReactiveElementBuilderCallback<starbeam.SimpleDomTypes>;
export type TagName = starbeam.Reactive<string>;

type BuilderElementArgs = [
  tagName: TagName,
  callback: BuilderCallback,
  expectation: Expects
];

type ShorthandElementArgs = [
  tagName: starbeam.IntoReactive<string>,
  options: TestElementOptions,
  expectation: Expects
];

export type TestElementArgs = BuilderElementArgs | ShorthandElementArgs;

function isNormalized(args: TestElementArgs): args is BuilderElementArgs {
  return typeof args[1] === "function";
}

export type NormalizedTestElementArgs = {
  tagName: starbeam.Reactive<string>;
  build: BuilderCallback;
  expectation: Expects;
};
