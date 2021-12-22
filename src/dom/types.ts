export interface DomTypes {
  document: unknown;
  fragment: unknown;
  node: unknown;
  text: unknown;
  comment: unknown;
  element: unknown;
  attribute: unknown;
}

export type ParentNode<T extends DomTypes> = T["document"] | T["fragment"];
export type DataNode<T extends DomTypes> = T["text"] | T["comment"];
export type AnyNode<T extends DomTypes> = T[keyof T];
