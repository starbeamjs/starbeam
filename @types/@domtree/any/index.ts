import type * as browser from "@domtree/browser";
import type * as minimal from "@domtree/minimal";
import type * as dom from "@domtree/interface";

export type Document = browser.Document | minimal.Document;
export type Text = browser.Text | minimal.Text;
export type Comment = browser.Comment | minimal.Comment;

export type DocumentFragment =
  | browser.DocumentFragment
  | minimal.DocumentFragment;

export type Element = browser.Element | minimal.ParentNode;

export type TemplateElement = browser.TemplateElement | minimal.TemplateElement;

export type Attr = browser.Attr | minimal.Attr;

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

export type CharacterData = minimal.CharacterData | browser.CharacterData;
export type ParentNode = minimal.ParentNode | browser.ParentNode;
export type ChildNode = minimal.ChildNode | browser.ChildNode;
export type Node = minimal.Node | browser.Node;
