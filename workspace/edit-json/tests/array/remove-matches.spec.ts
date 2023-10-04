import { getArrayAt } from "@starbeam-workspace/edit-json";
import { describe, expect, test } from "@starbeam-workspace/test-utils";

import { testSource } from "../support/source.js";
import { strippedJSON } from "../support/stripped.js";

describe("Array removals (matches)", () => {
  const compact = testSource/*json*/ `{
    "include": ["src", "workspace", "lib"],
    "exclude": ["dist", "node_modules"]
  }`;

  const multiline = testSource/*json*/ `{
    "include": [
      "src",
      "workspace",
      "lib"
    ],
    "exclude": [
      "dist",
      "node_modules"
    ]
  }`;

  describe("removing the only element in an array", () => {
    test("compact", () => {
      const { source, node } = testSource/*json*/ `{
        "include": ["src"],
        "exclude": ["dist", "node_modules"]
      }`;

      const remove = getArrayAt(node, "include")?.removeMatches(
        (n) => n === "src",
      );

      if (remove === undefined) {
        throw Error("couldn't remove element 0");
      }

      expect(remove.applyTo(source)).toEqual(strippedJSON/*json*/ `{
        "include": [],
        "exclude": ["dist", "node_modules"]
      }`);
    });

    test("multiline", () => {
      const { source, node } = testSource/*json*/ `{
        "include": [
          "src"
        ],
        "exclude": [
          "dist",
          "node_modules"
        ]
      }`;

      const remove = getArrayAt(node, "include")?.removeMatches(
        (n) => n === "src",
      );

      if (remove === undefined) {
        throw Error("couldn't remove element 0");
      }

      expect(remove.applyTo(source)).toEqual(strippedJSON/*json*/ `{
        "include": [],
        "exclude": [
          "dist",
          "node_modules"
        ]
      }`);
    });
  });

  describe("removing the first two elements", () => {
    test("compact", () => {
      const { source, node } = compact;

      const remove = getArrayAt(node, "include")?.removeMatches(
        (n) => n === "src" || n === "workspace",
      );

      if (remove === undefined) {
        throw Error("couldn't remove elements at 'include'");
      }

      expect(remove.applyTo(source)).toEqual(strippedJSON/*json*/ `{
        "include": ["lib"],
        "exclude": ["dist", "node_modules"]
      }`);
    });

    test("multiline", () => {
      const { source, node } = multiline;

      const remove = getArrayAt(node, "include")?.removeMatches(
        (n) => n === "src" || n === "workspace",
      );

      if (remove === undefined) {
        throw Error("couldn't remove elements at 'include'");
      }

      expect(remove.applyTo(source)).toEqual(strippedJSON/*json*/ `{
        "include": [
          "lib"
        ],
        "exclude": [
          "dist",
          "node_modules"
        ]
      }`);
    });
  });

  describe("removing the first and last element", () => {
    test("compact", () => {
      const { source, node } = compact;

      const remove = getArrayAt(node, "include")?.removeMatches(
        (n) => n === "src" || n === "lib",
      );

      if (remove === undefined) {
        throw Error("couldn't remove elements at 'include'");
      }

      expect(remove.applyTo(source)).toEqual(strippedJSON/*json*/ `{
        "include": ["workspace"],
        "exclude": ["dist", "node_modules"]
      }`);
    });

    test("multiline", () => {
      const { source, node } = multiline;

      const remove = getArrayAt(node, "include")?.removeMatches(
        (n) => n === "src" || n === "lib",
      );

      if (remove === undefined) {
        throw Error("couldn't remove elements at 'include'");
      }

      expect(remove.applyTo(source)).toEqual(strippedJSON/*json*/ `{
        "include": [
          "workspace"
        ],
        "exclude": [
          "dist",
          "node_modules"
        ]
      }`);
    });
  });

  describe("removing the first element", () => {
    test("compact", () => {
      const { source, node } = compact;

      const remove = getArrayAt(node, "include")?.removeMatches(
        (n) => n === "src",
      );

      if (remove === undefined) {
        throw Error("couldn't remove element 0");
      }

      expect(remove.applyTo(source)).toEqual(strippedJSON/*json*/ `{
      "include": ["workspace", "lib"],
      "exclude": ["dist", "node_modules"]
    }`);
    });

    test("multiline", () => {
      const { source, node } = multiline;

      const remove = getArrayAt(node, "include")?.removeMatches(
        (n) => n === "src",
      );

      if (remove === undefined) {
        throw Error("couldn't remove element 0");
      }

      expect(remove.applyTo(source)).toEqual(strippedJSON/*json*/ `{
        "include": [
          "workspace",
          "lib"
        ],
        "exclude": [
          "dist",
          "node_modules"
        ]
      }`);
    });
  });

  describe("removing the last element in an array", () => {
    test("compact", () => {
      const { source, node } = compact;

      const remove = getArrayAt(node, "include")?.removeMatches(
        (m) => m === "lib",
      );

      if (remove === undefined) {
        throw Error("couldn't remove element 1");
      }

      expect(remove.applyTo(source)).toEqual(strippedJSON/*json*/ `{
        "include": ["src", "workspace"],
        "exclude": ["dist", "node_modules"]
      }`);
    });

    test("multiline", () => {
      const { source, node } = multiline;

      const remove = getArrayAt(node, "include")?.removeMatches(
        (m) => m === "lib",
      );

      if (remove === undefined) {
        throw Error("couldn't remove element 1");
      }

      expect(remove.applyTo(source)).toEqual(strippedJSON/*json*/ `{
        "include": [
          "src",
          "workspace"
        ],
        "exclude": [
          "dist",
          "node_modules"
        ]
      }`);
    });
  });

  describe("removing the middle element in an array", () => {
    test("compact", () => {
      const { source, node } = testSource/*json*/ `{
      "refs": [{ "path": "src" }, { "path": "workspace" }, { "path": "config" }],
    }`;

      const remove = getArrayAt(node, "refs")?.removeMatches(
        (m) => !!(isRecord(m) && m["path"] === "workspace"),
      );

      if (remove === undefined) {
        throw Error("couldn't remove element 1");
      }

      expect(remove.applyTo(source)).toEqual(strippedJSON/*json*/ `{
        "refs": [{ "path": "src" }, { "path": "config" }],
      }`);
    });

    test("multiline", () => {
      const { source, node } = testSource/*json*/ `{
        "refs": [
          { "path": "src" },
          { "path": "workspace" },
          { "path": "config" }
        ],
      }`;

      const remove = getArrayAt(node, "refs")?.removeMatches(
        (m) => !!(isRecord(m) && m["path"] === "workspace"),
      );

      if (remove === undefined) {
        throw Error("couldn't remove element 1");
      }

      expect(remove.applyTo(source)).toEqual(strippedJSON/*json*/ `{
        "refs": [
          { "path": "src" },
          { "path": "config" }
        ],
      }`);
    });
  });
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
