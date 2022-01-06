declare module "@domtree/interface" {
  export interface DomTree {
    Document: unknown;
    DocumentFragment: unknown;
    DocumentType: unknown;
    Text: unknown;
    Comment: unknown;
    Element: unknown;
    TemplateElement: unknown;
    Attr: unknown;
    StaticRange: unknown;
  }

  export type Impl<T extends DomTree> = T;

  export type CharacterData<T extends DomTree> = T["Text"] | T["Comment"];
  export type ParentNode<T extends DomTree> =
    | T["Document"]
    | T["DocumentFragment"]
    | T["Element"];

  export type ChildNode<T extends DomTree> =
    | T["DocumentType"]
    | T["Element"]
    | CharacterData<T>;

  export type Node<T extends DomTree> =
    | ParentNode<T>
    | ChildNode<T>
    | T["Attr"];
}

declare module "@domtree/browser" {
  import * as dom from "@domtree/interface";

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
}

declare module "@domtree/any" {
  import * as browser from "@domtree/browser";
  import * as minimal from "@domtree/minimal";
  import * as dom from "@domtree/interface";

  export type Document = browser.Document | minimal.Document;
  export type Text = browser.Text | minimal.Text;
  export type Comment = browser.Comment | minimal.Comment;

  export type DocumentFragment =
    | browser.DocumentFragment
    | minimal.DocumentFragment;

  export type Element = browser.Element | minimal.ParentNode;

  export type TemplateElement =
    | browser.TemplateElement
    | minimal.TemplateElement;

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
}

declare module "@domtree/flavors" {
  export * as anydom from "@domtree/any";
  export * as browser from "@domtree/browser";
  export * as minimal from "@domtree/minimal";
}
