import { exhaustive } from "../..";
import {
  ContentKind,
  HtmlInsertionMode,
  InsertionMode,
  NormalizedTagName,
  TokenizedTagName,
} from "../tree-construction";
import type { Attributes, TokenizedAttributes } from "./attributes";
import { MATHML_ATTRIBUTE_ADJUSTMENTS } from "./mathml";
import { SVG_ATTRIBUTE_ADJUSTMENTS, SVG_TAG_ADJUSTMENTS } from "./svg";

export class TreeContext {
  static of(mode: AnyInsertionMode): TreeContext {
    return new TreeContext(mode);
  }

  readonly #mode: AnyInsertionMode;

  private constructor(mode: AnyInsertionMode) {
    this.#mode = mode;
  }

  start(
    tagName: TokenizedTagName,
    _attributes: TokenizedAttributes
  ): { context: TreeContext; tag: NormalizedTagName; attributes: Attributes } {
    let tag = this.#mode.normalizeTag(tagName);
    let state = child(this.#mode, tag);

    switch (state.type) {
      case "unexpected":
        throw new Error("Tree Construction Error: (TODO: message)");
      case "context":
        {
          // @ts-expect-error
          let _attributes = state.value;
        }
        throw Error("todo: TreeContext#start with context");
      case "unchanged":
        throw Error("todo: TreeContext#start with unchanged");
      case "empty":
        throw Error("todo: TreeContext#start with empty");
    }
  }
}

type AnyContentKind = HTML_CONTENT | SVG_CONTENT | MATHML_CONTENT;
export type ContentKindName = AnyContentKind["name"];

type ChildResult =
  | {
      type: "context";
      value: TreeContext;
    }
  | {
      type: "unchanged";
    }
  | {
      type: "unexpected";
    }
  | { type: "empty" };

function Context(mode: AnyInsertionMode): ChildResult {
  return { type: "context", value: TreeContext.of(mode) };
}

const UNCHANGED: ChildResult = { type: "unchanged" };
const UNEXPECTED: ChildResult = { type: "unexpected" };
const EMPTY: ChildResult = { type: "empty" };

// Starbeam tree construction rules:
//
// We process a sequence of commands that correspond to:
//
// - valid HTML in the "in body" state (valid means: when parsed, the spec does
//   not indicate that any parse errors are to be emitted)
// - without any implied closing tags
function child(mode: AnyInsertionMode, tag: NormalizedTagName): ChildResult {
  switch (mode.name) {
    case "svg": {
      switch (tag) {
        case "foreignObject":
        case "desc":
        case "title":
          return Context(TOP_LEVEL_HTML);
        default:
          return UNCHANGED;
      }
    }

    case "mathml": {
      return UNCHANGED;
    }

    case "text": {
      throw Error("todo: child element in text insertion mode");
    }

    case "top-level": {
      switch (tag) {
        case "textarea":
          return Context(TEXT);
        case "svg":
          return Context(TOP_LEVEL_HTML);
        case "math":
          return Context(TOP_LEVEL_HTML);
        case "table":
          return Context(TABLE_BODY);
        case "select":
          return Context(SELECT_BODY);
        default:
          return Context(TOP_LEVEL_HTML);
      }
    }

    case "top-level": {
      switch (tag) {
        case "tr":
          return Context(TABLE_ROW);
        case "tbody":
        case "thead":
        case "tfoot":
          return UNCHANGED;
        case "caption":
          return Context(TOP_LEVEL_HTML);
        case "colgroup":
          return Context(COLUMN_GROUP);
        default:
          return UNEXPECTED;
      }
    }

    case "table-body": {
      throw Error("todo: table-body in child");
    }

    case "table-row": {
      switch (tag) {
        case "th":
        case "td":
          return Context(TOP_LEVEL_HTML);
        default:
          return UNEXPECTED;
      }
    }

    case "column-group": {
      switch (tag) {
        case "col":
          return EMPTY;
        default:
          return UNEXPECTED;
      }
    }

    case "select-body": {
      switch (tag) {
        case "option":
          return EMPTY;
        case "optgroup":
          return UNCHANGED;
        default:
          return UNEXPECTED;
      }
    }

    default: {
      exhaustive(mode);
      return UNEXPECTED;
    }
  }
}

const HTML_CONTENT = ContentKind("html", {
  normalizeTag: (tag) => tag,
  normalizeAttributes: (attributes) => attributes.adjust(),
});

export type HTML_CONTENT = ContentKind & { readonly name: "html" };

const TEXT = HtmlInsertionMode("text", (_tag) => {
  throw Error("todo: The text insertion mode");
});

export type TEXT = typeof TEXT;

const TOP_LEVEL_HTML = HtmlInsertionMode("top-level", (_tag) => {
  throw Error("todo: TOP_LEVEL_HTML");
});

export type TOP_LEVEL_HTML = typeof TOP_LEVEL_HTML;

const TABLE_BODY = HtmlInsertionMode("table-body", (_tag) => {
  throw Error("todo: table-body");
});

export type TABLE_BODY = typeof TABLE_BODY;

const TABLE_ROW = HtmlInsertionMode("table-row", (_tag) => {
  throw Error("todo: table-row");
});

export type TABLE_ROW = typeof TABLE_ROW;

const SELECT_BODY = HtmlInsertionMode("select-body", (_tag) => {
  throw Error("todo: select-body");
});

export type SELECT_BODY = typeof SELECT_BODY;

const COLUMN_GROUP = HtmlInsertionMode("column-group", (_tag) => {
  throw Error("todo: column-group");
});

export type COLUMN_GROUP = typeof COLUMN_GROUP;

const SVG_CONTENT = InsertionMode("svg", {
  normalizeAttributes: (attrs) => attrs.adjust(SVG_ATTRIBUTE_ADJUSTMENTS),
  normalizeTag: (tag) => SVG_TAG_ADJUSTMENTS.adjust(tag),
  start: (_tag) => {
    throw Error("todo: SVG_CONTENT.start");
  },
});

export type SVG_CONTENT = typeof SVG_CONTENT;

const MATHML_CONTENT = InsertionMode("mathml", {
  normalizeAttributes: (attrs) => attrs.adjust(MATHML_ATTRIBUTE_ADJUSTMENTS),
  normalizeTag: (tag) => tag,
  start: (_tag) => {
    throw Error("todo: SVG_CONTENT.start");
  },
});

export type MATHML_CONTENT = typeof MATHML_CONTENT;

export type AnyInsertionMode =
  | TEXT
  | TOP_LEVEL_HTML
  | TABLE_BODY
  | TABLE_ROW
  | SELECT_BODY
  | COLUMN_GROUP
  | SVG_CONTENT
  | MATHML_CONTENT;

export type InsertionModeName = AnyInsertionMode["name"];
