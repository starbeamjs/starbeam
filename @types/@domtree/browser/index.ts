import type * as dom from "@domtree/interface";

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
}>;

export type ParentNode = dom.ParentNode<DomTree>;
export type ChildNode = dom.ChildNode<DomTree>;
export type CharacterData = dom.CharacterData<DomTree>;
