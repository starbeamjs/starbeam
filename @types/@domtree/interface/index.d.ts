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
export declare type Impl<T extends DomTree> = T;
export declare type CharacterData<T extends DomTree> = T["Text"] | T["Comment"];
export declare type ParentNode<T extends DomTree> = T["Document"] | T["DocumentFragment"] | T["Element"];
export declare type ChildNode<T extends DomTree> = T["DocumentType"] | T["Element"] | CharacterData<T>;
export declare type Node<T extends DomTree> = ParentNode<T> | ChildNode<T> | T["Attr"];
//# sourceMappingURL=index.d.ts.map