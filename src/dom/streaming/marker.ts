import type { minimal } from "../../../tests/support/starbeam";
import { assert, verified, verify } from "../../strippable/assert";
import { has, is, mutable } from "../../strippable/minimal";
import { as } from "../../strippable/verify-context";
import type { ContentBuffer } from "../cursor/append";
import type { ElementHeadBuffer } from "../cursor/attribute";
import { ContentRange } from "./compatible-dom";
import { Token, tokenId } from "./token";

// This might be necessary for some obscure cases where <template> is disallowed
// by comments are allowed. That said, there are some cases where comments are
// also not allowed (RCDATA contexts like `<textarea>`) that require a solution
// as well.
export const COMMENT = {} as const;

export const SINGLE_ELEMENT = {
  start(output: string[], token: Token): void {
    output.push(`starbeam-marker:content="${tokenId(token)}"`);
  },
};

export type ElementContext = "html" | "mathml" | "svg";

export interface BodyTransform {
  <B extends ContentBuffer>(buffer: B): B;
}

export function Body(
  callback: <B extends ContentBuffer>(buffer: B) => B
): BodyTransform {
  return callback;
}

export interface ElementTransform {
  <B extends ElementHeadBuffer>(buffer: B): void;
}

export function Element(
  callback: <B extends ElementHeadBuffer>(buffer: B) => void
): ElementTransform {
  return callback;
}

interface AbstractMarker<Out> {
  hydrate(container: minimal.ParentNode, token: Token): Out;
}

export type Marker<Out = unknown> = AbstractMarker<Out>;

interface AbstractContentMarker<Out> extends Marker<Out> {
  mark: <B extends ContentBuffer>(
    buffer: B,
    token: Token,
    body: (buffer: B) => B
  ) => B;
}

export type ContentMarker<Out = unknown> = AbstractContentMarker<Out>;

export class AttributeMarker implements AbstractMarker<minimal.Attr> {
  mark(
    buffer: ElementHeadBuffer,
    token: Token,
    qualifiedName: string
  ): ElementHeadBuffer {
    return buffer
      .attr(`data-starbeam-marker:attr:${tokenId(token)}`, qualifiedName)
      .attr(`data-starbeam-marker:attrs`, { value: "", type: "idempotent" });
  }

  hydrate(container: minimal.ParentNode, token: Token): minimal.Attr {
    let attrName = String.raw`data-starbeam-marker\:attr\:${tokenId(token)}`;
    let element = findElement(
      container,
      selector(`data-starbeam-marker:attr:${tokenId(token)}`)
    );

    let attr = verified(element.getAttributeNode(attrName), is.Present);
    element.removeAttribute(attrName);
    element.removeAttribute(`data-starbeam-marker:attrs`);
    return attr;
  }
}

export const ATTRIBUTE_MARKER = new AttributeMarker();

export class ElementMarker implements AbstractMarker<minimal.Element> {
  mark(buffer: ElementHeadBuffer, token: Token): ElementHeadBuffer {
    return buffer.concatAttr("data-starbeam-marker", tokenId(token), ",");
  }

  hydrate(container: minimal.ParentNode, token: Token): minimal.Element {
    let element = findElement(
      container,
      selector(`data-starbeam-marker`, tokenId(token))
    );
    element.removeAttribute(`data-starbeam-marker`);
    return element;
  }
}

export const ELEMENT_MARKER = new ElementMarker();

class RangeMarker {
  mark = <B extends ContentBuffer>(
    buffer: B,
    token: Token,
    body: (input: B) => B
  ): B => {
    return body(
      buffer.element("template", (t) =>
        t.attr("data-starbeam-marker:start", tokenId(token)).empty()
      )
      // We need an ending marker to distinguish this text node from other text nodes
    ).element("template", (t) =>
      t.attr("data-starbeam-marker:end", tokenId(token)).empty()
    );
  };
}

export class CharacterDataMarker
  extends RangeMarker
  implements AbstractContentMarker<minimal.CharacterData>
{
  hydrate(container: minimal.ParentNode, token: Token): minimal.CharacterData {
    let range = Markers.find(container, token).hydrateRange();

    assert(range.type === "node");
    verify(range.node, is.CharacterData);

    return range.node;
  }
}

export const CHARACTER_DATA_MARKER = new CharacterDataMarker();

export class ContentRangeMarker
  extends RangeMarker
  implements AbstractContentMarker<ContentRange>
{
  hydrate(container: minimal.ParentNode, token: Token): ContentRange {
    return Markers.find(container, token).hydrateRange();
  }
}

class Markers {
  static find(container: minimal.ParentNode, token: Token): Markers {
    let start = findElement(
      container,
      selector(`data-starbeam-marker:start`, tokenId(token))
    );
    let end = findElement(
      container,
      selector(`data-starbeam-marker:end`, tokenId(token))
    );

    verify(start, is.Template);
    verify(end, is.Template);

    return new Markers(start, end);
  }

  readonly #start: minimal.TemplateElement;
  readonly #end: minimal.TemplateElement;

  private constructor(
    start: minimal.TemplateElement,
    end: minimal.TemplateElement
  ) {
    this.#start = start;
    this.#end = end;
  }

  hydrateRange(): ContentRange {
    let first = this.#start.nextSibling;
    let last = this.#end.previousSibling;

    verify(first, is.Present);
    verify(last, is.Present);

    mutable(this.#start).remove();
    mutable(this.#end).remove();

    return ContentRange(first, last);
  }
}

function selector(attr: string, value?: string): string {
  let escapedName = attr.replace(/:/g, String.raw`\:`);

  if (value === undefined) {
    return `[${escapedName}]`;
  } else {
    let escapedValue = value.replace(/"/g, String.raw`\"`);
    return `[${escapedName}="${escapedValue}"]`;
  }
}

function findElement(
  container: minimal.ParentNode,
  selector: string
): minimal.Element {
  let elements = [...container.querySelectorAll(selector)];

  verify(elements, has.length(1), as(`${selector} in ${container}`));
  verify(elements[0], is.Element, as(`the first child of ${container}`));

  return elements[0];
}
