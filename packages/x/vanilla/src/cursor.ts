export class Cursor {
  static appendTo(node: ParentNode): Cursor {
    return new Cursor(node, null);
  }

  static insertBefore(parent: ParentNode, node: Node): Cursor {
    return new Cursor(parent, node);
  }

  readonly #parentNode: ParentNode;
  readonly #nextSibling: Node | null;
  readonly #document: Document;

  constructor(parentNode: ParentNode, nextSibling: Node | null) {
    this.#parentNode = parentNode;
    this.#nextSibling = nextSibling;

    if (parentNode.ownerDocument === null) {
      throw new Error(
        "Cursor must be created with a parent node that is part of a document",
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
