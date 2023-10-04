import type * as jsonc from "jsonc-parser";

import { getPosition } from "../../representation/nodes/abstract.js";
import type { JsonObjectNode } from "../../representation/nodes/object.js";
import type { SourceRoot } from "../../representation/source.js";
import type { JsoncModification } from "../edits.js";
import { JsonModification } from "../edits.js";
import { formatPath, rangeToModification } from "../utils.js";

export function remove(
  root: SourceRoot,
  node: JsonObjectNode,
  path: jsonc.JSONPath,
  key: string,
): JsonModification {
  const removal = node.entry(key);

  const fullPath = [...path, key];

  if (removal === undefined) {
    throw Error(
      `BUG: attempted to remove an entry that doesn't exist (at ${formatPath(
        fullPath,
      )})`,
    );
  }

  return new JsonModification(
    {
      tag: "remove",
      toDiagnostic: (create) => {
        return create.diagnostic(`Removing ${formatPath([...path, key])}`, {
          color: "red",
          label: "removing from",
          secondary: [
            {
              message: "removing",
              range: removal.range,
            },
          ],
        });
      },

      toModification: (): JsoncModification => {
        // if the node is the last element in the array, remove everything
        // after the previous element until the end of the array

        const position = getPosition(removal);

        if (position === undefined) {
          throw Error(
            `BUG: attempted to remove an element that doesn't exist (at ${formatPath(
              fullPath,
            )})`,
          );
        }

        const innerRange = node.innerRange({ whitespace: "include" });

        switch (position.at) {
          case "last": {
            return rangeToModification({
              format: node.range,
              edit: position.prev.range.cursorAfter.until(
                removal.range.cursorAfter,
              ),
            });
          }

          case "first": {
            // in general, we want to remove from the start of this node
            // to the beginning of the next node.

            // Consider: if the node is on its own line, like this:
            // [
            //   "node_modules",
            //   "package.json"
            // ]
            //
            // then removing "node_modules" up to the opening quote of
            // "package.json" will produce:
            // [
            //   "package.json"
            // ]
            //
            // If the whole array is on one line, line this:
            // [ "node_modules", "package.json" ]
            //
            // then removing "node_modules" up to the opening quote of
            // "package.json" will produce:
            // [ "package.json" ]
            //
            // Both of behave the way we want.

            const editRange = removal.range.startUntil(position.next.range);

            return rangeToModification({
              format: node.range,
              edit: editRange,
            });
          }

          case "only": {
            return rangeToModification({
              format: node.range,
              edit: innerRange,
            });
          }

          case "middle": {
            return rangeToModification({
              format: node.range,
              edit: position.prev.range.cursorAfter.until(
                removal.range.cursorAfter,
              ),
            });
          }
        }
      },
    },
    node,
  );
}
