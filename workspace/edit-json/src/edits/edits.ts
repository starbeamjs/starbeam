import { isPresentArray } from "@starbeam/core-utils";
import chalk from "chalk";
import * as codespan from "codespan-wasm";
import * as jsonc from "jsonc-parser";

import type { EmittableDiagnostic } from "../diagnostics.js";
import {
  CreateDiagnostic,
  getPrimary,
  getSecondary,
  isCollapsed,
} from "../diagnostics.js";
import type { JsonValueNode } from "../representation/node.js";
import type { SourceRange } from "../representation/source.js";
import type { DESCRIBE_CHANGE } from "./utils.js";

const CHARS = codespan.CHARS_BOX_DRAWING;

export class JsoncModification {
  static empty(): JsoncModification {
    return new JsoncModification([], [], { offset: 0, length: 0 });
  }

  static of(
    edits: jsonc.Edit | jsonc.Edit[],
    ranges: SourceRange[],
    format: jsonc.Range,
  ): JsoncModification {
    return new JsoncModification(
      Array.isArray(edits) ? edits : [edits],
      ranges,
      format,
    );
  }

  readonly #edits: jsonc.Edit[];
  readonly #editRanges: SourceRange[];
  readonly #format: jsonc.Range;

  private constructor(
    edit: jsonc.Edit[],
    editRanges: SourceRange[],
    format: jsonc.Range,
  ) {
    this.#edits = edit;
    this.#editRanges = editRanges;
    this.#format = format;
  }

  hasEdits(): boolean {
    return isPresentArray(this.#edits);
  }

  get range(): SourceRange[] {
    return this.#editRanges;
  }

  applyTo(source: string): string {
    const edited = jsonc.applyEdits(source, this.#edits);

    const formatEdit = jsonc
      .format(edited, this.#format, {
        tabSize: 2,
        insertSpaces: true,
        keepLines: true,
      })
      // ignore changes that are just a single space without a newline
      .filter((f) => /[^ ]/.exec(f.content));

    return jsonc.applyEdits(edited, formatEdit);
  }
}

interface JsonModificationDelegate {
  tag: keyof typeof DESCRIBE_CHANGE;

  /**
   * Convert a modification to an emittable diagnostic.
   *
   * If the modification is empty and `verbose` is `true`, this function must
   * return a special diagnostic that indicates that there's nothing to do. If
   * `verbose` is `false` and there is nothing to do, this function must return
   * `undefined`.
   */
  toDiagnostic: (
    create: CreateDiagnostic,
    options: { verbose: boolean },
  ) => EmittableDiagnostic | undefined;
  toModification: () => JsoncModification;
}

export class JsonModification {
  readonly #delegate: JsonModificationDelegate;
  readonly #node: JsonValueNode;
  #modificationCache: JsoncModification | undefined;

  constructor(delegate: JsonModificationDelegate, node: JsonValueNode) {
    this.#delegate = delegate;
    this.#node = node;
  }

  [Symbol.toStringTag](): string {
    return this.#delegate.tag;
  }

  [Symbol.for("nodejs.util.inspect.custom")](): string {
    return this.display({ verbose: true });
  }

  get #modification(): JsoncModification {
    return (this.#modificationCache ??= this.#delegate.toModification());
  }

  display(options: { verbose: true }): string;
  display(options?: { verbose: boolean }): string | undefined;
  display(
    options: { verbose: boolean } = { verbose: false },
  ): string | undefined {
    const result = this.#delegate.toDiagnostic(
      new CreateDiagnostic(this.#node.marker),
      options,
    );

    if (result === undefined) return;

    const { file, diagnostic, color: color } = result;
    const primary = getPrimary(diagnostic);
    const secondary = getSecondary(diagnostic);

    return (
      codespan.emitDiagnostic(
        [file],
        diagnostic,
        {
          tabWidth: 2,
          styles: PrimaryColor(color),
          chars: {
            ...CHARS,
            singlePrimaryCaret: primary && isCollapsed(primary) ? "▴" : "─",
            singleSecondaryCaret:
              secondary && isCollapsed(secondary) ? "▴" : "┄",
          },
        },
        true,
      ) + chalk.reset()
    );
  }

  hasChanges(): boolean {
    return this.#modification.hasEdits();
  }

  applyTo(source: string): string {
    return this.#modification.applyTo(source);
  }

  toModification(): JsoncModification {
    return this.#modification;
  }
}

const DEFAULT_STYLE = {
  bold: false,
  dimmed: false,
  intense: false,
  italic: false,
  reset: false,
  underline: false,
};
type DEFAULT_STYLE = typeof DEFAULT_STYLE;

export type IntoColor =
  | (Omit<codespan.ColorSpec, keyof DEFAULT_STYLE> &
      Partial<typeof DEFAULT_STYLE>)
  | codespan.Color;

export function Color(options: IntoColor): codespan.ColorSpec {
  if (typeof options === "string") {
    return { fgColor: options, ...DEFAULT_STYLE };
  } else {
    return {
      ...DEFAULT_STYLE,
      ...options,
    };
  }
}

function PrimaryColor(
  colorSpec: codespan.ColorSpec | codespan.Color,
): codespan.Styles {
  const color =
    typeof colorSpec === "string"
      ? Color({
          fgColor: colorSpec,
        })
      : colorSpec;

  return {
    headerNote: {
      ...color,
      dimmed: true,
    },

    headerMessage: {
      ...color,
      reset: true,
    },

    primaryLabelNote: color,
    secondaryLabel: color,

    sourceBorder: Color({ fgColor: "cyan" }),
    lineNumber: Color({ fgColor: "cyan" }),
    noteBullet: Color({ fgColor: "cyan" }),
  };
}
