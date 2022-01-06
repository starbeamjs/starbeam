import type { minimal } from "@domtree/flavors";
import { assert, verified, verify } from "../../strippable/assert";
import { has, is } from "../../strippable/minimal";
import { as } from "../../strippable/verify-context";
import type { ElementHeadBuffer } from "../buffer/attribute";
import type { ContentBuffer } from "../buffer/body";
import { ContentRange, MINIMAL_DOM } from "./compatible-dom";
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

interface AbstractHydration<Out> {
  hydrate(container: minimal.ParentNode, token: Token): Out;
}

export type Hydration<Out = unknown> = AbstractHydration<Out>;

interface AbstractMarker<Buffer> {
  <B extends Buffer>(buffer: B, token: Token, body?: (buffer: B) => B): B;
}

export type Marker<Buffer = unknown, Out = unknown> = {
  readonly mark: AbstractMarker<Buffer>;
  readonly hydrator: AbstractHydration<Out>;
};

function Marker<Buffer, Out>(marker: Marker<Buffer, Out>): Marker<Buffer, Out> {
  return marker;
}

export class AttributeMarker implements AbstractHydration<minimal.Attr> {
  forName(qualifiedName: string): Marker<ElementHeadBuffer> {
    return Marker({
      mark: (buffer, token) =>
        buffer
          .attr(`data-starbeam-marker:attr:${tokenId(token)}`, qualifiedName)
          // TODO: use idempotentAttr
          .attr(`data-starbeam-marker:attrs`, {
            value: "",
            type: "idempotent",
          }),
      hydrator: this,
    });
  }

  hydrate(container: minimal.ParentNode, token: Token): minimal.Attr {
    let attrName = String.raw`data-starbeam-marker\:attr\:${tokenId(token)}`;
    let element = findElement(
      container,
      attrSelector(`data-starbeam-marker:attr:${tokenId(token)}`)
    );

    let attr = verified(element.getAttributeNode(attrName), is.Present);
    element.removeAttribute(attrName);
    element.removeAttribute(`data-starbeam-marker:attrs`);
    return attr;
  }
}

export const ATTRIBUTE_MARKER = new AttributeMarker();

export class ElementMarker implements AbstractHydration<minimal.Element> {
  readonly marker: Marker<ElementHeadBuffer, minimal.Element> = Marker({
    mark: (buffer, token) =>
      buffer.attr("data-starbeam-marker", tokenId(token)),
    hydrator: this,
  });

  hydrate(container: minimal.ParentNode, token: Token): minimal.Element {
    let element = findElement(
      container,
      attrSelector(`data-starbeam-marker:element`, tokenId(token))
    );
    element.removeAttribute(`data-starbeam-marker:element`);
    return element;
  }
}

export const ELEMENT_MARKER = new ElementMarker().marker;

abstract class RangeMarker<Out> implements AbstractHydration<Out> {
  readonly marker: Marker<ContentBuffer> = Marker({
    mark: <B extends ContentBuffer>(
      buffer: B,
      token: Token,
      body: (input: B) => B = (input) => input
    ): B => {
      let marked = buffer.element("template", (t) =>
        t.attr("data-starbeam-marker:start", tokenId(token)).empty()
      );

      if (body) {
        body(marked);
      }

      return marked.element("template", (t) =>
        // We need an ending marker to distinguish this text node from other text nodes
        t.attr("data-starbeam-marker:end", tokenId(token)).empty()
      );
    },
    hydrator: this,
  });

  abstract hydrate(container: minimal.ParentNode, token: Token): Out;
}

export class CharacterDataMarker extends RangeMarker<minimal.ReadonlyCharacterData> {
  hydrate(
    container: minimal.ParentNode,
    token: Token
  ): minimal.ReadonlyCharacterData {
    let range = Markers.find(container, token).hydrateRange();

    assert(range.type === "node");
    verify(range.node, is.CharacterData);

    return range.node;
  }
}

export const CHARACTER_DATA_MARKER = new CharacterDataMarker().marker;

export class ContentRangeMarker extends RangeMarker<ContentRange> {
  hydrate(container: minimal.ParentNode, token: Token): ContentRange {
    return Markers.find(container, token).hydrateRange();
  }
}

class Markers {
  static find(container: minimal.ParentNode, token: Token): Markers {
    let start = findElement(
      container,
      attrSelector(`data-starbeam-marker:start`, tokenId(token))
    );
    let end = findElement(
      container,
      attrSelector(`data-starbeam-marker:end`, tokenId(token))
    );

    verify(start, is.TemplateElement);
    verify(end, is.TemplateElement);

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

    if (first === this.#end) {
      MINIMAL_DOM.remove(this.#start);
      return MINIMAL_DOM.replace(this.#end, (cursor) => {
        let comment = MINIMAL_DOM.document.createComment("");
        MINIMAL_DOM.insert(comment, cursor);
        return ContentRange(comment);
      });
    } else {
      verify(first, is.Present);
      verify(last, is.Present);

      MINIMAL_DOM.remove(this.#start);
      MINIMAL_DOM.remove(this.#end);
      return ContentRange(first, last);
    }
  }
}

export function attrSelector(attr: string, value?: string): string {
  let escapedName = attr.replace(/:/g, String.raw`\:`);

  if (value === undefined) {
    return `[${escapedName}]`;
  } else {
    let escapedValue = value.replace(/"/g, String.raw`\"`);
    return `[${escapedName}="${escapedValue}"]`;
  }
}

export function findElement(
  container: minimal.ParentNode,
  selector: string
): minimal.Element {
  let elements = [...container.querySelectorAll(selector)];

  verify(elements, has.length(1), as(`${selector} in ${container}`));
  verify(elements[0], is.Element, as(`the first child of ${container}`));

  return elements[0];
}

export function findElements(
  container: minimal.ParentNode,
  selector: string
): IterableIterator<minimal.Element> {
  return container.querySelectorAll(
    selector
  ) as IterableIterator<minimal.Element>;
}
