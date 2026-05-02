import { ElementPlaceholder } from "@starbeam/modifier";
import { describe, expect, test } from "@starbeam-workspace/test-utils";

type ElementConstructor<E extends Element> = abstract new <
  Args extends unknown[],
>(
  ...args: Args
) => E;

class TestElement {
  readonly tagName = "TEST";
}

class OtherElement {
  readonly tagName = "OTHER";
}

const TEST_ELEMENT = TestElement as unknown as ElementConstructor<Element>;

describe("ElementPlaceholder", () => {
  test("current is null before initialization", () => {
    const placeholder = ElementPlaceholder(TEST_ELEMENT, undefined);

    expect(placeholder.current).toBeNull();
  });

  test("initialize accepts an instance of the constructor", () => {
    const placeholder = ElementPlaceholder(TEST_ELEMENT, undefined);
    const element = new TestElement() as Element;

    placeholder.initialize(element);

    expect(placeholder.current).toBe(element);
  });

  test("initialize rejects an instance of the wrong constructor", () => {
    const placeholder = ElementPlaceholder(TEST_ELEMENT, undefined);
    const element = new OtherElement();

    if (import.meta.env.DEV) {
      expect(() => {
        placeholder.initialize(element as Element);
      }).toThrowError("instance of TestElement");
    } else {
      placeholder.initialize(element as Element);
    }

    expect(placeholder.current).toBe(import.meta.env.DEV ? null : element);
  });

  test("initializing more than once throws after updating the current element", () => {
    const placeholder = ElementPlaceholder(TEST_ELEMENT, undefined);
    const first = new TestElement() as Element;
    const second = new TestElement() as Element;

    placeholder.initialize(first);

    expect(() => {
      placeholder.initialize(second);
    }).toThrow(TypeError);

    expect(placeholder.current).toBe(second);
  });
});
