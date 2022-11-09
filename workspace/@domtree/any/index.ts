import type * as browser from "@domtree/browser";
import type * as dom from "@domtree/interface";
import type * as minimal from "@domtree/minimal";

export type Document = browser.Document | minimal.Document;
export type Text = browser.Text | minimal.Text;
export type Comment = browser.Comment | minimal.Comment;

export type DocumentFragment =
  | browser.DocumentFragment
  | minimal.DocumentFragment;

export type Element = browser.Element | minimal.Element;
export type TemplateElement = browser.TemplateElement | minimal.TemplateElement;

export type StaticRange = browser.StaticRange | minimal.StaticRange;
export type StaticRangeOptions =
  | browser.StaticRangeOptions
  | minimal.StaticRangeOptions;
export type LiveRange = browser.LiveRange | minimal.LiveRange;

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
  LiveRange: LiveRange;
}>;

export type CharacterData = minimal.CharacterData | browser.CharacterData;
export type ParentNode = minimal.ParentNode | browser.ParentNode;
export type ChildNode = minimal.ChildNode | browser.ChildNode;
export type Node = minimal.Node | browser.Node;

export type Minimal<N extends Node | LiveRange | StaticRange> = N extends
  | minimal.Node
  | minimal.LiveRange
  | minimal.StaticRange
  ? N
  : N extends LiveRange
  ? minimal.LiveRange
  : N extends StaticRange
  ? minimal.StaticRange
  : N extends Document
  ? minimal.Document
  : N extends DocumentType
  ? minimal.DocumentType
  : N extends DocumentFragment
  ? minimal.DocumentFragment
  : N extends Text
  ? minimal.Text
  : N extends Comment
  ? minimal.Comment
  : N extends Element
  ? minimal.Element
  : N extends TemplateElement
  ? minimal.TemplateElement
  : N extends Attr
  ? minimal.Attr
  : N extends StaticRange
  ? minimal.StaticRange
  : N extends LiveRange
  ? minimal.LiveRange
  : never;
