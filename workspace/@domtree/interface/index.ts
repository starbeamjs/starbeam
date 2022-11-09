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
  LiveRange: unknown;
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

export type Node<T extends DomTree> = ParentNode<T> | ChildNode<T> | T["Attr"];
