import { getArrayAt } from "@starbeam-workspace/edit-json";
import { describe, expect, test } from "@starbeam-workspace/test-utils";

import { testSource } from "../support/source.js";
import { strippedJSON } from "../support/stripped.js";

describe("Array removals", () => {
  const { source, node } = testSource/*json*/ `{
    "include": ["src"],
    "exclude": ["dist", "node_modules"]
  }`;

  test("removing the only element in an array", () => {
    const remove = getArrayAt(node, "include")?.removeAt(0);

    if (remove === undefined) {
      throw Error("couldn't remove element 0");
    }

    expect(remove.applyTo(source)).toEqual(strippedJSON/*json*/ `{
      "include": [],
      "exclude": ["dist", "node_modules"]
    }`);
  });

  test("removing the first element in an array", () => {
    const remove = getArrayAt(node, "exclude")?.removeAt(0);

    if (remove === undefined) {
      throw Error("couldn't remove element 0");
    }

    expect(remove.applyTo(source)).toEqual(strippedJSON/*json*/ `{
      "include": ["src"],
      "exclude": ["node_modules"]
    }`);
  });

  test("removing the last element in an array", () => {
    const remove = getArrayAt(node, "exclude")?.removeAt(1);

    if (remove === undefined) {
      throw Error("couldn't remove element 1");
    }

    expect(remove.applyTo(source)).toEqual(strippedJSON/*json*/ `{
      "include": ["src"],
      "exclude": ["dist"]
    }`);
  });

  test("removing the middle element in an array", () => {
    const { source, node } = testSource/*json*/ `{
      "refs": [{ "path": "src" }, { "path": "workspace" }, { "path": "config" }],
    }`;

    const remove = getArrayAt(node, "refs")?.removeAt(1);

    if (remove === undefined) {
      throw Error("couldn't remove element 1");
    }

    expect(remove.applyTo(source)).toEqual(strippedJSON/*json*/ `{
      "refs": [{ "path": "src" }, { "path": "config" }],
    }`);
  });

  test("removing the final element in an array with a trailing comma", () => {
    const { source, node } = testSource`{ "include": ["src", "config",] }`;

    const remove = getArrayAt(node, "include")?.removeAt(1);

    if (remove === undefined) {
      throw Error("couldn't remove element 1");
    }

    expect(remove.applyTo(source)).toEqual(`{ "include": ["src",] }`);
  });

  test("removing the final element in an array with a trailing comma and newlines", () => {
    const { source, node } = testSource/*json*/ `{
      "include": [
        "src",
        "config",
      ]
    }`;

    const remove = getArrayAt(node, "include")?.removeAt(1);

    if (remove === undefined) {
      throw Error("couldn't remove element 1");
    }

    expect(remove.applyTo(source)).toEqual(strippedJSON/*json*/ `{
      "include": [
        "src",
      ]
    }`);
  });
});
