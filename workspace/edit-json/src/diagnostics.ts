import * as codespan from "codespan-wasm";

import { Color, type IntoColor } from "./edits/edits.js";
import { type IntoSourceRange, SourceRange } from "./representation/source.js";

interface DiagnosticLabel {
  message: string;
  range: SourceRange;
}

export class CreateDiagnostic {
  readonly #range: SourceRange;

  constructor(range: SourceRange) {
    this.#range = range;
  }

  diagnostic(
    message: string,
    {
      color,
      label,
      primary = this.#range,
      secondary,
      notes,
      note,
    }: {
      color: IntoColor;
      label: string;
      primary?: IntoSourceRange | undefined;
      secondary?: DiagnosticLabel | DiagnosticLabel[];
      notes?: string[];
      note?: string;
    },
  ): EmittableDiagnostic {
    const labels = [this.label(label, { style: "primary", range: primary })];

    if (secondary) {
      const secondaries = Array.isArray(secondary) ? secondary : [secondary];

      for (const secondary of secondaries) {
        labels.push(
          this.label(secondary.message, {
            style: "secondary",
            range: secondary.range,
          }),
        );
      }
    }

    const notesArray = [...(notes ?? [])];
    if (note) notesArray.push(note);

    return {
      file: this.#range.root,
      color: Color(color),
      diagnostic: {
        message,
        severity: "note",
        labels,
        notes: notesArray,
      },
    };
  }

  label(
    message: string,
    {
      style,
      range: intoRange = this.#range,
    }: { style: codespan.LabelStyle; range?: IntoSourceRange | undefined },
  ): codespan.Label {
    const range = SourceRange.marker(intoRange);
    return {
      style,
      fileId: range.root.name,
      rangeStart: range.start,
      rangeEnd: range.end,
      message,
    };
  }
}

export interface DisplayOptions {
  header?: string;
  note?: string;
}

export function display(
  node: IntoSourceRange,
  { header = "Displaying", note = "this node" }: DisplayOptions = {},
): string {
  const { file, diagnostic } = new CreateDiagnostic(
    SourceRange.marker(node),
  ).diagnostic(header, { color: "yellow", label: note });

  return codespan.emitDiagnostic([file], diagnostic, {}, true);
}

export interface EmittableDiagnostic {
  file: codespan.File;
  diagnostic: codespan.Diagnostic;
  color: codespan.ColorSpec | codespan.Color;
}

export function intoColorSpec(
  spec: codespan.Color | IntoColor,
): codespan.ColorSpec {
  return typeof spec === "string" ? Color({ fgColor: spec }) : Color(spec);
}

export function isCollapsed(label: codespan.Label): boolean {
  return label.rangeStart === label.rangeEnd;
}

export function getPrimary(
  diagnostic: codespan.Diagnostic,
): codespan.Label | undefined {
  return diagnostic.labels?.find((l) => l.style === "primary");
}

export function getSecondary(
  diagnostic: codespan.Diagnostic,
): codespan.Label | undefined {
  return diagnostic.labels?.find((l) => l.style === "secondary");
}
