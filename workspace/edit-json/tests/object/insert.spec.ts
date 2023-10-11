import { isPresent, verified } from "@starbeam/verify";
import { getObjectAt } from "@starbeam-workspace/edit-json";
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

describe("Object insertions", () => {
  describe("inserting into an empty object", () => {
    function inserting(name: string, value: JsonValue) {
      test(`inserting a ${name}`, () => {
        const { source, node } = testSource/*json*/ `{
          "compilerOptions": {}
        }`;

        const insertion = verified(
          getObjectAt(node, "compilerOptions"),
          isPresent,
        ).set("target", value);

        expect(insertion.applyTo(source)).toEqual(
          strippedJSON/*json*/ `{
            "compilerOptions": { "target": ${value} }
          }`,
        );
      });
    }

    for (const [caseName, value] of Object.entries(CASES)) {
      inserting(caseName, value);
    }
  });

  describe("replacing", () => {
    describe("replacing the only entry in an object", () => {
      describe("into a compact object", () => {
        for (const [caseName, value] of Object.entries(CASES)) {
          test(`replacing a ${caseName} into a compact object`, () => {
            const { source, node } = testSource/*json*/ `{
              "compilerOptions": { "target": "es2020" }
            }`;

            const replace = verified(
              getObjectAt(node, "compilerOptions"),
              isPresent,
            ).set("target", value);

            expect(replace.applyTo(source)).toEqual(
              strippedJSON/*json*/ `{
                "compilerOptions": { "target": ${value} }
              }`,
            );
          });
        }
      });

      describe("into a multiline object", () => {
        for (const [caseName, value] of Object.entries(CASES)) {
          test(`replacing a ${caseName} into a multiline object`, () => {
            const { source, node } = testSource/*json*/ `{
              "compilerOptions": {
                "target": "es2020"
              }
            }`;

            const replace = verified(
              getObjectAt(node, "compilerOptions"),
              isPresent,
            ).set("target", value);

            expect(replace.applyTo(source)).toEqual(
              strippedJSON/*json*/ `{
                "compilerOptions": {
                  "target": ${value}
                }
              }`,
            );
          });
        }
      });
    });

    describe("replacing the first entry in an object", () => {
      describe("into a compact object", () => {
        for (const [caseName, value] of Object.entries(CASES)) {
          test(`replacing a ${caseName} into a compact object`, () => {
            const { source, node } = testSource/*json*/ `{
              "compilerOptions": { "target": "es2020", "module": "esnext" }
            }`;

            const replace = verified(
              getObjectAt(node, "compilerOptions"),
              isPresent,
            ).set("target", value);

            expect(replace.applyTo(source)).toEqual(
              strippedJSON/*json*/ `{
                "compilerOptions": { "target": ${value}, "module": "esnext" }
              }`,
            );
          });
        }
      });

      describe("into a multiline object", () => {
        for (const [caseName, value] of Object.entries(CASES)) {
          test(`replacing a ${caseName} into a multiline object`, () => {
            const { source, node } = testSource/*json*/ `{
              "compilerOptions": {
                "target": "es2020",
                "module": "esnext"
              }
            }`;

            const replace = verified(
              getObjectAt(node, "compilerOptions"),
              isPresent,
            ).set("target", value);

            expect(replace.applyTo(source)).toEqual(
              strippedJSON/*json*/ `{
                "compilerOptions": {
                  "target": ${value},
                  "module": "esnext"
                }
              }`,
            );
          });
        }
      });
    });

    describe("replacing the last entry in an object", () => {
      describe("into a compact object", () => {
        for (const [caseName, value] of Object.entries(CASES)) {
          test(`replacing a ${caseName} into a compact object`, () => {
            const { source, node } = testSource/*json*/ `{
              "compilerOptions": { "target": "es2020", "module": "esnext" }
            }`;

            const replace = verified(
              getObjectAt(node, "compilerOptions"),
              isPresent,
            ).set("module", value);

            expect(replace.applyTo(source)).toEqual(
              strippedJSON/*json*/ `{
                "compilerOptions": { "target": "es2020", "module": ${value} }
              }`,
            );
          });
        }
      });

      describe("into a multiline object", () => {
        for (const [caseName, value] of Object.entries(CASES)) {
          test(`replacing a ${caseName} into a multiline object`, () => {
            const { source, node } = testSource/*json*/ `{
              "compilerOptions": {
                "target": "es2020",
                "module": "esnext"
              }
            }`;

            const replace = verified(
              getObjectAt(node, "compilerOptions"),
              isPresent,
            ).set("module", value);

            expect(replace.applyTo(source)).toEqual(
              strippedJSON/*json*/ `{
                "compilerOptions": {
                  "target": "es2020",
                  "module": ${value}
                }
              }`,
            );
          });
        }
      });
    });

    describe("replacing a middle entry in an object", () => {
      describe("into a compact object", () => {
        for (const [caseName, value] of Object.entries(CASES)) {
          test(`replacing a ${caseName} into a compact object`, () => {
            const { source, node } = testSource/*json*/ `{
              "compilerOptions": { "target": "es2020", "module": "esnext", "skipLibCheck": true }
            }`;

            const replace = verified(
              getObjectAt(node, "compilerOptions"),
              isPresent,
            ).set("module", value);

            expect(replace.applyTo(source)).toEqual(
              strippedJSON/*json*/ `{
                "compilerOptions": { "target": "es2020", "module": ${value}, "skipLibCheck": true }
              }`,
            );
          });
        }
      });

      describe("into a multiline object", () => {
        for (const [caseName, value] of Object.entries(CASES)) {
          test(`replacing a ${caseName} into a multiline object`, () => {
            const { source, node } = testSource/*json*/ `{
              "compilerOptions": {
                "target": "es2020",
                "module": "esnext",
                "skipLibCheck": true
              }
            }`;

            const replace = verified(
              getObjectAt(node, "compilerOptions"),
              isPresent,
            ).set("module", value);

            expect(replace.applyTo(source)).toEqual(
              strippedJSON/*json*/ `{
                "compilerOptions": {
                  "target": "es2020",
                  "module": ${value},
                  "skipLibCheck": true
                }
              }`,
            );
          });
        }
      });
    });
  });

  describe("initializing", () => {
    describe("initializing the first entry in an object", () => {
      describe("into a compact object", () => {
        for (const [caseName, value] of Object.entries(CASES)) {
          test(`initializing a ${caseName} into a compact object`, () => {
            const { source, node } = testSource/*json*/ `{
              "compilerOptions": { "module": "esnext" }
            }`;

            const replace = verified(
              getObjectAt(node, "compilerOptions"),
              isPresent,
            ).set("target", value, { position: "start" });

            expect(replace.applyTo(source)).toEqual(
              strippedJSON/*json*/ `{
                "compilerOptions": { "target": ${value}, "module": "esnext" }
              }`,
            );
          });
        }
      });

      describe("into a multiline object", () => {
        for (const [caseName, value] of Object.entries(CASES)) {
          test(`replacing a ${caseName} into a multiline object`, () => {
            const { source, node } = testSource/*json*/ `{
              "compilerOptions": {
                "target": "es2020",
                "module": "esnext"
              }
            }`;

            const replace = verified(
              getObjectAt(node, "compilerOptions"),
              isPresent,
            ).set("target", value, { position: "end" });

            expect(replace.applyTo(source)).toEqual(
              strippedJSON/*json*/ `{
                "compilerOptions": {
                  "target": ${value},
                  "module": "esnext"
                }
              }`,
            );
          });
        }
      });
    });

    describe("initializing the last entry in an object", () => {
      describe("into a compact object", () => {
        for (const [caseName, value] of Object.entries(CASES)) {
          test(`initializing a ${caseName} into a compact object`, () => {
            const { source, node } = testSource/*json*/ `{
              "compilerOptions": { "target": "es2020" }
            }`;

            const replace = verified(
              getObjectAt(node, "compilerOptions"),
              isPresent,
            ).set("module", value, { position: "end" });

            expect(replace.applyTo(source)).toEqual(
              strippedJSON/*json*/ `{
                "compilerOptions": { "target": "es2020", "module": ${value} }
              }`,
            );
          });
        }
      });

      describe("into a multiline object", () => {
        for (const [caseName, value] of Object.entries(CASES)) {
          test(`replacing a ${caseName} into a multiline object`, () => {
            const { source, node } = testSource/*json*/ `{
              "compilerOptions": {
                "target": "es2020"
              }
            }`;

            const replace = verified(
              getObjectAt(node, "compilerOptions"),
              isPresent,
            ).set("module", value, { position: "end" });

            expect(replace.applyTo(source)).toEqual(
              strippedJSON/*json*/ `{
                "compilerOptions": {
                  "target": "es2020",
                  "module": ${value}
                }
              }`,
            );
          });
        }
      });
    });

    describe("replacing a middle entry in an object", () => {
      describe("into a compact object", () => {
        for (const [caseName, value] of Object.entries(CASES)) {
          test(`replacing a ${caseName} into a compact object`, () => {
            const { source, node } = testSource/*json*/ `{
              "compilerOptions": { "target": "es2020", "skipLibCheck": true }
            }`;

            const replace = verified(
              getObjectAt(node, "compilerOptions"),
              isPresent,
            ).set("module", value, { after: "target" });

            expect(replace.applyTo(source)).toEqual(
              strippedJSON/*json*/ `{
                "compilerOptions": { "target": "es2020", "module": ${value}, "skipLibCheck": true }
              }`,
            );
          });
        }
      });

      describe("into a multiline object", () => {
        for (const [caseName, value] of Object.entries(CASES)) {
          test(`replacing a ${caseName} into a multiline object`, () => {
            const { source, node } = testSource/*json*/ `{
              "compilerOptions": {
                "target": "es2020",
                "module": "esnext",
                "skipLibCheck": true
              }
            }`;

            const replace = verified(
              getObjectAt(node, "compilerOptions"),
              isPresent,
            ).set("module", value, { after: "target" });

            expect(replace.applyTo(source)).toEqual(
              strippedJSON/*json*/ `{
                "compilerOptions": {
                  "target": "es2020",
                  "module": ${value},
                  "skipLibCheck": true
                }
              }`,
            );
          });
        }
      });
    });
  });
});
