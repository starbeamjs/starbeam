export class Cursor {
  static appendTo(node: ParentNode) {
    return new Cursor(node, null);
  }

  static insertBefore(parent: ParentNode, node: Node) {
    return new Cursor(parent, node);
  }

  #parentNode: ParentNode;
  #nextSibling: Node | null;
  #document: Document;

  constructor(parentNode: ParentNode, nextSibling: Node | null) {
    this.#parentNode = parentNode;
    this.#nextSibling = nextSibling;

    if (parentNode.ownerDocument === null) {
      throw new Error(
        "Cursor must be created with a parent node that is part of a document"
      );
    }
    this.#document = parentNode.ownerDocument;
  }

  insert(node: ChildNode): ChildNode {
    this.#parentNode.insertBefore(node, this.#nextSibling);
    return node;
  }

  get document(): Document {
    return this.#document;
  }
}
