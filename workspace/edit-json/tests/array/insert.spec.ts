import { isPresent, verified } from "@starbeam/verify";
import { getArrayAt } from "@starbeam-workspace/edit-json";
import { describe, expect, test } from "@starbeam-workspace/test-utils";
import type { JsonValue } from "typed-json-utils";

import { testSource } from "../support/source.js";
import { strippedJSON } from "../support/stripped.js";

const CASES = {
  "a string": "lib",
  "a number": 1,
  true: true,
  false: false,
  null: null,
  "an object": { foo: "bar" },
  "an array": [1, 2, 3],
};

describe("Array insertions", () => {
  describe("inserting into an empty array", () => {
    function inserting(name: string, value: JsonValue) {
      test(`inserting a ${name}`, () => {
        const { source, node } = testSource/*json*/ `{
          "include": [],
          "exclude": ["dist", "node_modules"]
        }`;

        const insertion = verified(
          getArrayAt(node, "include"),
          isPresent,
        ).append(value);

        expect(insertion.applyTo(source)).toEqual(
          strippedJSON/*json*/ `{
            "include": [${value}],
            "exclude": ["dist", "node_modules"]
          }`,
        );
      });
    }

    for (const [caseName, value] of Object.entries(CASES)) {
      inserting(caseName, value);
    }
  });

  describe("inserting the first element in an array", () => {
    for (const [caseName, value] of Object.entries(CASES)) {
      test(`inserting a ${caseName} into a compact array`, () => {
        const { source, node } = testSource/*json*/ `{
          "include": ["src"],
          "exclude": ["dist", "node_modules"]
        }`;

        const insert = verified(getArrayAt(node, "include"), isPresent).prepend(
          value,
        );

        expect(insert.applyTo(source)).toEqual(
          strippedJSON/*json*/ `{
            "include": [${value}, "src"],
            "exclude": ["dist", "node_modules"]
          }`,
        );
      });

      test(`inserting a ${caseName} into a multiline array`, () => {
        const { source, node } = testSource/*json*/ `{
          "include": [
            "src"
          ],
          "exclude": ["dist", "node_modules"]
        }`;

        const insert = verified(getArrayAt(node, "include"), isPresent).prepend(
          value,
        );

        expect(insert.applyTo(source)).toEqual(
          strippedJSON/*json*/ `{
            "include": [
              ${value},
              "src"
            ],
            "exclude": ["dist", "node_modules"]
          }`,
        );
      });
    }
  });

  describe("inserting the last element in an array", () => {
    for (const [caseName, value] of Object.entries(CASES)) {
      test(`inserting a ${caseName} into a compact array`, () => {
        const { source, node } = testSource/*json*/ `{
          "include": ["src"],
          "exclude": ["dist", "node_modules"]
        }`;

        const insert = verified(getArrayAt(node, "include"), isPresent).insert(
          value,
          { after: -1 },
        );

        expect(insert.applyTo(source)).toEqual(
          strippedJSON/*json*/ `{
            "include": ["src", ${value}],
            "exclude": ["dist", "node_modules"]
          }`,
        );
      });

      test(`inserting a ${caseName} into a multiline array`, () => {
        const { source, node } = testSource/*json*/ `{
          "include": [
            "src"
          ],
          "exclude": ["dist", "node_modules"]
        }`;

        const insert = verified(getArrayAt(node, "include"), isPresent).insert(
          value,
          { after: -1 },
        );

        expect(insert.applyTo(source)).toEqual(
          strippedJSON/*json*/ `{
            "include": [
              "src",
              ${value}
            ],
            "exclude": ["dist", "node_modules"]
          }`,
        );
      });
    }
  });

  describe("inserting an element between elements of an array", () => {
    for (const [caseName, value] of Object.entries(CASES)) {
      test(`inserting a ${caseName} into a compact array`, () => {
        const { source, node } = testSource/*json*/ `{
          "include": ["src"],
          "exclude": ["dist", "node_modules"]
        }`;

        const insert = verified(getArrayAt(node, "exclude"), isPresent).insert(
          value,
          { after: 0 },
        );

        expect(insert.applyTo(source)).toEqual(
          strippedJSON/*json*/ `{
            "include": ["src"],
            "exclude": ["dist", ${value}, "node_modules"]
          }`,
        );
      });

      test(`inserting a ${caseName} into a multiline array`, () => {
        const { source, node } = testSource/*json*/ `{
          "include": ["src"],
          "exclude": [
            "dist",
            "node_modules"
          ]
        }`;

        const insert = verified(getArrayAt(node, "exclude"), isPresent).insert(
          value,
          { after: 0 },
        );

        expect(insert.applyTo(source)).toEqual(
          strippedJSON/*json*/ `{
            "include": ["src"],
            "exclude": [
              "dist",
              ${value},
              "node_modules"
            ]
          }`,
        );
      });
    }
  });
});
