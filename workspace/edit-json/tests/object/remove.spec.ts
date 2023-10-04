import { getObjectAt } from "@starbeam-workspace/edit-json";
import { describe, expect, test } from "@starbeam-workspace/test-utils";

import { testSource } from "../support/source.js";
import { strippedJSON } from "../support/stripped.js";

describe("removals", () => {
  test("removing the only element in an object", () => {
    const { source, node } = testSource/*json*/ `{
      "compilerOptions": {
        "target": "es2020"
      }
    }`;

    const remove = getObjectAt(node, "compilerOptions")?.delete("target");

    if (remove === undefined) {
      throw Error("couldn't remove element 0");
    }

    expect(remove.applyTo(source)).toEqual(strippedJSON/*json*/ `{
      "compilerOptions": {}
    }`);
  });

  describe("removing the only element in an object", () => {
    test("a compact object", () => {
      const { source, node } = testSource/*json*/ `{
        "compilerOptions": { "target": "es2020", "module": "esnext" }
      }`;

      const remove = getObjectAt(node, "compilerOptions")?.delete("target");

      if (remove === undefined) {
        throw Error("couldn't remove element 0");
      }

      expect(remove.applyTo(source)).toEqual(strippedJSON/*json*/ `{
        "compilerOptions": { "module": "esnext" }
      }`);
    });

    test("a multiline object", () => {
      const { source, node } = testSource/*json*/ `{
        "compilerOptions": {
          "target": "es2020",
          "module": "esnext"
        }
      }`;

      const remove = getObjectAt(node, "compilerOptions")?.delete("target");

      if (remove === undefined) {
        throw Error("couldn't remove element 0");
      }

      expect(remove.applyTo(source)).toEqual(strippedJSON/*json*/ `{
        "compilerOptions": {
          "module": "esnext"
        }
      }`);
    });
  });

  describe("removing the last element in an object", () => {
    test("a compact object", () => {
      const { source, node } = testSource/*json*/ `{
        "compilerOptions": { "target": "es2020", "module": "esnext" }
      }`;

      const remove = getObjectAt(node, "compilerOptions")?.delete("module");

      if (remove === undefined) {
        throw Error("couldn't remove module");
      }

      expect(remove.applyTo(source)).toEqual(strippedJSON/*json*/ `{
        "compilerOptions": { "target": "es2020" }
      }`);
    });

    test("a multiline object", () => {
      const { source, node } = testSource/*json*/ `{
        "compilerOptions": {
          "target": "es2020",
          "module": "esnext"
        }
      }`;

      const remove = getObjectAt(node, "compilerOptions")?.delete("module");

      if (remove === undefined) {
        throw Error("couldn't remove 'module' entry");
      }

      expect(remove.applyTo(source)).toEqual(strippedJSON/*json*/ `{
        "compilerOptions": {
          "target": "es2020"
        }
      }`);
    });
  });

  describe("removing a middle entry in an object", () => {
    test("a compact object", () => {
      const { source, node } = testSource/*json*/ `{
        "compilerOptions": { "target": "es2020", "module": "esnext", "skipLibCheck": true }
      }`;

      const remove = getObjectAt(node, "compilerOptions")?.delete("module");

      if (remove === undefined) {
        throw Error("couldn't remove module");
      }

      expect(remove.applyTo(source)).toEqual(strippedJSON/*json*/ `{
        "compilerOptions": { "target": "es2020", "skipLibCheck": true }
      }`);
    });

    test("a multiline object", () => {
      const { source, node } = testSource/*json*/ `{
        "compilerOptions": {
          "target": "es2020",
          "module": "esnext",
          "skipLibCheck": true
        }
      }`;

      const remove = getObjectAt(node, "compilerOptions")?.delete("module");

      if (remove === undefined) {
        throw Error("couldn't remove 'module' entry");
      }

      expect(remove.applyTo(source)).toEqual(strippedJSON/*json*/ `{
        "compilerOptions": {
          "target": "es2020",
          "skipLibCheck": true
        }
      }`);
    });
  });
});
