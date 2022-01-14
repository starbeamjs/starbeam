import type { browser } from "@domtree/flavors";
import type * as dom from "@domtree/interface";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  interface NodeList {
    [Symbol.iterator](): IterableIterator<globalThis.Node>;
  }

  interface Window {
    StaticRange: {
      new (options: browser.StaticRangeOptions): browser.StaticRange;
    };
  }
}

export type Node = globalThis.Node;
export type Document = globalThis.Document;
export type DocumentType = globalThis.DocumentType;
export type DocumentFragment = globalThis.DocumentFragment;
export type Text = globalThis.Text;
export type Comment = globalThis.Comment;
export type Element = globalThis.Element;
export type TemplateElement = globalThis.HTMLTemplateElement;
export type Attr = globalThis.Attr;
export type StaticRange = globalThis.StaticRange;
export type LiveRange = globalThis.Range;

export interface StaticRangeOptions {
  endContainer: Node;
  endOffset: number;
  startContainer: Node;
  startOffset: number;
}

export type DomTree = dom.Impl<{
  Node: Node;
  Document: Document;
  DocumentType: DocumentType;
  DocumentFragment: DocumentFragment;
  Text: Text;
  Comment: Comment;
  Element: Element;
  TemplateElement: TemplateElement;
  Attr: Attr;
  StaticRange: StaticRange;
  LiveRange: LiveRange;
}>;

export type ParentNode = dom.ParentNode<DomTree>;
export type ChildNode = dom.ChildNode<DomTree>;
export type CharacterData = dom.CharacterData<DomTree>;
