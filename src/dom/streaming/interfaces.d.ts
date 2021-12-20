declare module "@domtree/browser" {
  export type Node = globalThis.Node;
  export type ParentNode = globalThis.ParentNode;
  export type ChildNode = globalThis.ChildNode;
  export type Document = globalThis.Document;
  export type DocumentFragment = globalThis.DocumentFragment;
  export type CharacterData = globalThis.CharacterData;
  export type Text = globalThis.Text;
  export type Comment = globalThis.Comment;
  export type Element = globalThis.Element;
  export type TemplateElement = globalThis.HTMLTemplateElement;
  export type Attr = globalThis.Attr;
}

declare module "@domtree/simple" {
  export {
    SimpleNode as Node,
    SimpleDocument as Document,
    SimpleText as Text,
    SimpleComment as Comment,
    SimpleElement as Element,
    SimpleDocumentFragment as DocumentFragment,
    SimpleAttr as Attr,
  } from "@simple-dom/interface";

  import * as simple from "@simple-dom/interface";

  export type ParentNode =
    | simple.SimpleElement
    | simple.SimpleDocument
    | simple.SimpleDocumentFragment;

  export type CharacterData = simple.SimpleText | simple.SimpleComment;
  export type ChildNode =
    | simple.SimpleElement
    | simple.SimpleDocumentType
    | simple.SimpleText
    | simple.SimpleComment;

  export type TemplateElement = simple.SimpleElement & {
    readonly tagName: "TEMPLATE";
  };
}
