import type { JsonValue } from "@starbeam-workspace/json";
import type * as jsonc from "jsonc-parser";

import { getIndex, getPosition } from "../../representation/nodes/abstract.js";
import type { JsonArrayNode } from "../../representation/nodes/array.js";
import type { SourceRange, SourceRoot } from "../../representation/source.js";
import { JsoncModification, JsonModification } from "../edits.js";

export function removeMatches(
  root: SourceRoot,
  node: JsonArrayNode,
  path: jsonc.JSONPath,
  matches: (value: JsonValue) => boolean,
): JsonModification {
  const children = node.children;
  const removals = children.filter((child) => matches(child.value));

  return new JsonModification(
    {
      tag: "remove",
      toDiagnostic: (create) => {
        return create.diagnostic(
          `Removing ${removals.map((r) => getIndex(r)).join(", ")}`,
          {
            color: "red",
            label: "removing from",
            secondary: removals.map((r) => ({
              message: "removing",
              range: r.range,
            })),
          },
        );
      },

      toModification: (): JsoncModification => {
        const innerRange = node.innerRange({ whitespace: "include" });

        const allRemovals = removals.map(
          (r): { edits: jsonc.Edit[]; ranges: SourceRange[] } => {
            const position = getPosition(r);

            if (position === undefined) return { edits: [], ranges: [] };

            switch (position.at) {
              case "only": {
                return {
                  edits: [{ ...innerRange.asJsoncRange(), content: "" }],
                  ranges: [innerRange],
                };
              }

              case "last": {
                const range = position.prev.range.cursorAfter.until(
                  r.range.cursorAfter,
                );

                return {
                  ranges: [range],
                  edits: [
                    {
                      ...range.asJsoncRange(),
                      content: "",
                    },
                  ],
                };
              }

              case "first":
              case "middle": {
                const range = r.range.startCursor.until(
                  position.next.range.startCursor,
                );
                return {
                  ranges: [range],
                  edits: [
                    {
                      ...range.asJsoncRange(),
                      content: "",
                    },
                  ],
                };
              }
            }
          },
        );

        const edits = allRemovals.flatMap((r) => r.edits);
        const ranges = allRemovals.flatMap((r) => r.ranges);

        return JsoncModification.of(edits, ranges, node.range.asJsoncRange());
      },
    },
    node,
  );
}
