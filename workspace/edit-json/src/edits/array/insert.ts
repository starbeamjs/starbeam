import type * as jsonc from "jsonc-parser";
import type { JsonValue } from "typed-json-utils";

import { getRange } from "../../representation/nodes/abstract.js";
import type { JsonArrayNode } from "../../representation/nodes/array.js";
import type { SourceRoot } from "../../representation/source.js";
import { stringify } from "../../stringify.js";
import { JsonModification } from "../edits.js";
import { DESCRIBE_CHANGE, formatPath, rangeToModification } from "../utils.js";

export type UniqueInsertOption = boolean | ((value: JsonValue) => boolean);

export type InsertIntoArrayOptions =
  | {
      position: "start";
      unique: UniqueInsertOption;
    }
  | {
      position: "end";
      unique: UniqueInsertOption;
    }
  | {
      position: "after";
      after: number;
      unique: UniqueInsertOption;
    };

export function insert(
  root: SourceRoot,
  node: JsonArrayNode,
  path: jsonc.JSONPath,
  value: JsonValue,
  options: InsertIntoArrayOptions,
): JsonModification {
  return new JsonModification(
    {
      tag: "append",
      toDiagnostic: (create) => {
        const cursor = root.rangeAtCursors(node.range.inner).cursorAfter;

        return create.diagnostic(
          `${DESCRIBE_CHANGE.append} ${formatPath(path)}`,
          {
            color: "cyan",
            label: "appending to",
            secondary: {
              message: `appending here`,
              range: cursor.asRange(),
            },
            note: `Appending ${stringify(value)} to the array at ${formatPath(
              path,
            )}`,
          },
        );
      },

      toModification: () => {
        function insertOnly() {
          return rangeToModification(
            { edit: getRange(node).inner, format: getRange(node) },
            JSON.stringify(value),
          );
        }

        if (node.isEmpty) {
          return insertOnly();
        }

        if (options.position === "start") {
          const insertBefore = node.first;

          if (insertBefore === undefined) return insertOnly();

          const wsTrail = node.range.onSameLine(insertBefore.range)
            ? " "
            : "\n";

          return rangeToModification(
            {
              edit: insertBefore.range.cursorBefore.asRange(),
              format: node.range,
            },
            `${JSON.stringify(value)},${wsTrail}`,
          );
        }

        const insertAfter =
          options.position === "end" ? node.last : node.at(options.after);

        if (insertAfter === undefined) {
          return insertOnly();
        }

        const wsTrail = node.range.onSameLine(insertAfter.range) ? " " : "\n";

        return rangeToModification(
          {
            edit: insertAfter.range.cursorAfter.asRange(),
            format: node.range,
          },
          `,${wsTrail}${JSON.stringify(value)}`,
        );
      },
    },
    node,
  );
}
