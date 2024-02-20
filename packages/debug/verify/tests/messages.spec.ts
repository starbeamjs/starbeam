import { expected } from "@starbeam/verify";
import { describe, expect, test } from "vitest";

describe("isPresent", () => {
  test("a basic message", () => {
    expect(expected.toBe("present").message(null)).toEqual(
      "Expected value to be present"
    );
  });

  test("a message when additional context is added", () => {
    expect(expected("node").toBe("present").message(null)).toEqual(
      "Expected node to be present"
    );

    expect(expected.as("node").toBe("present").message(null)).toEqual(
      "Expected node to be present"
    );
  });

  test("a message when a scenario is added", () => {
    expect(
      expected
        .as("element")
        .when("appending to the DOM")
        .toBe("present")
        .message(null)
    ).toEqual("When appending to the DOM: Expected element to be present");
  });

  test("custom formatting", () => {
    const e = expected
      .as("node")
      .when("appending to the DOM")
      .toBe("a text node")
      .butGot((value) => JSON.stringify(value));

    expect(e.message({ nodeType: 1 })).toEqual(
      `When appending to the DOM: Expected node to be a text node, but it was {"nodeType":1}`
    );

    expect(e.message({ toJSON: () => `something weird` })).toEqual(
      `When appending to the DOM: Expected node to be a text node, but it was "something weird"`
    );
  });
});
