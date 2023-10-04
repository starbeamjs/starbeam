import { getFirst, getLast, isEmptyArray } from "@starbeam/core-utils";
import type { JsonValue } from "@starbeam-workspace/json";
import chalk from "chalk";
import type * as jsonc from "jsonc-parser";

import { getRange } from "../../representation/nodes/abstract.js";
import type { JsonObjectNode } from "../../representation/nodes/object.js";
import { type SourceRoot } from "../../representation/source.js";
import { stringify } from "../../stringify.js";
import {
  type IntoColor,
  JsoncModification,
  JsonModification,
} from "../edits.js";
import { formatPath, isEquivalent, rangeToModification } from "../utils.js";

export type InsertIntoObjectOptions =
  | {
      position: "start";
    }
  | {
      position: "end";
    }
  | {
      position: "after";
      after: string;
    };

export function insert(
  root: SourceRoot,
  node: JsonObjectNode,
  path: jsonc.JSONPath,
  [key, value]: [key: string, value: JsonValue],
  options: InsertIntoObjectOptions,
): JsonModification {
  return new JsonModification(
    {
      tag: "append",
      toDiagnostic: (create, { verbose }) => {
        const modification = toModification();
        const ranges = isEmptyArray(modification.range)
          ? undefined
          : modification.range;

        if (!verbose && !ranges) return;

        const note = ranges
          ? `Inserting ${chalk.gray(`${key}:`)} ${stringify(
              value,
            )} at ${formatPath(path)}`
          : `Nothing to do. The value of ${chalk.magenta.bold(
              key,
            )} at ${formatPath(path)} is already equivalent to ${stringify(
              value,
            )}`;

        const color: IntoColor = ranges
          ? "cyan"
          : { fgColor: "black", intense: true };

        return create.diagnostic(`Inserting at ${formatPath(path)}`, {
          color,
          label: "into this object",
          secondary: modification.range.map((r) => ({
            message: `inserting here`,
            range: r,
          })),
          note,
        });
      },

      toModification,
    },
    node,
  );

  function toModification(): JsoncModification {
    const entryString = `${JSON.stringify(key)}: ${JSON.stringify(value)}`;

    const jsonValue = node.value;

    if (key in jsonValue && isEquivalent(jsonValue[key], value)) {
      return JsoncModification.empty();
    }

    function insertOnly() {
      return rangeToModification(
        { edit: getRange(node).inner, format: getRange(node) },
        ` ${entryString} `,
      );
    }

    if (node.isEmpty) {
      return insertOnly();
    }

    const entry = node.entry(key);

    if (entry) {
      return rangeToModification(
        {
          edit: entry.range,
          format: node.range,
        },
        entryString,
      );
    }

    if (options.position === "after") {
      const entry = node.entry(options.after);

      if (entry) {
        const wsTrail = node.range.onSameLine(entry.range) ? " " : "\n";

        return rangeToModification(
          {
            edit: entry.range.cursorAfter.asRange(),
            format: node.range,
          },
          `,${wsTrail}${entryString}`,
        );
      }
    }

    if (options.position === "start") {
      const insertBefore = getFirst(node.entries);

      if (insertBefore === undefined) return insertOnly();

      const wsTrail = node.range.onSameLine(insertBefore.range) ? " " : "\n";

      return rangeToModification(
        {
          edit: insertBefore.range.cursorBefore.asRange(),
          format: node.range,
        },
        `${entryString},${wsTrail}`,
      );
    }

    const insertAfter = getLast(node.entries);

    if (insertAfter === undefined) {
      return insertOnly();
    }

    const wsTrail = node.range.onSameLine(insertAfter.range) ? " " : "\n";

    return rangeToModification(
      {
        edit: insertAfter.range.cursorAfter.asRange(),
        format: node.range,
      },
      `,${wsTrail}${entryString}`,
    );
  }
}
