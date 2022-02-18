import type { browser } from "@domtree/flavors";
import type * as dom from "@domtree/interface";
declare global {
    interface NodeList {
        [Symbol.iterator](): IterableIterator<globalThis.Node>;
    }
    interface Window {
        StaticRange: {
            new (options: browser.StaticRangeOptions): browser.StaticRange;
        };
    }
}
export declare type Node = globalThis.Node;
export declare type Document = globalThis.Document;
export declare type DocumentType = globalThis.DocumentType;
export declare type DocumentFragment = globalThis.DocumentFragment;
export declare type Text = globalThis.Text;
export declare type Comment = globalThis.Comment;
export declare type Element = globalThis.Element;
export declare type TemplateElement = globalThis.HTMLTemplateElement;
export declare type Attr = globalThis.Attr;
export declare type StaticRange = globalThis.StaticRange;
export declare type LiveRange = globalThis.Range;
export declare type HTMLElement = globalThis.HTMLElement;
export declare type Window = typeof globalThis.window;
export interface StaticRangeOptions {
    endContainer: Node;
    endOffset: number;
    startContainer: Node;
    startOffset: number;
}
export declare type DomTree = dom.Impl<{
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
export declare type ParentNode = dom.ParentNode<DomTree>;
export declare type ChildNode = dom.ChildNode<DomTree>;
export declare type CharacterData = dom.CharacterData<DomTree>;
