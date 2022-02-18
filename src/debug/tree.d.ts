interface TreeifyObject {
    [k: string]: TreeifyValue;
}
export declare type TreeifyValue = string | TreeifyObject | TreeifyObject[] | null;
export declare type IntoTreeRecord = {
    [key: string]: IntoTreeValue;
};
export interface BuildTree {
    (build: (builder: TreeRecordBuilder) => TreeRecordBuilder): TreeRecord;
    (build: IntoTreeRecord): TreeRecord;
    value(value: string): TreeContent;
    value(value: IntoTreeRecord): TreeRecord;
    value(value: IntoTreeList): TreeList;
    value(value: IntoTreeValue): TreeValue;
}
declare class TreeRecordBuilder {
    #private;
    static build(build: ((builder: TreeRecordBuilder) => TreeRecordBuilder) | IntoTreeRecord): TreeRecord;
    private constructor();
    list(label: string, items: string[] | TreeContent[] | (TreeRecord | IntoTreeRecord)[], defaultValue?: string): this;
    entry(label: string, value: IntoTreeValue | ((builder: TreeRecordBuilder) => TreeRecordBuilder)): this;
    add(...nodes: TreeEntry[]): this;
}
export declare const tree: BuildTree;
export declare type IntoTreeEntry = [label: string, value: IntoTreeValue];
/**
 * A TreeEntry represents a label with an (optional) associated TreeValue
 */
export declare class TreeEntry {
    #private;
    static create(label: string, value: TreeValue): TreeEntry;
    static from([label, value]: IntoTreeEntry): TreeEntry;
    private constructor();
    appendTo(object: TreeifyObject): void;
}
export declare type IntoTreeValue = string | IntoTreeRecord | IntoTreeList;
/**
 * A TreeValue represents the contents associated with a label. It can either be
 * an atomic value, or it can be a nested tree.
 */
export declare abstract class TreeValue {
    static is(value: unknown): value is TreeValue;
    static value(from: IntoTreeValue): TreeValue;
    abstract appendTo(treeify: TreeifyObject, label: string): void;
}
export declare type IntoTreeListItem = string | IntoTreeRecord;
export declare type TreeListItem = TreeContent | TreeRecord;
export declare type IntoTreeRecordValue = IntoTreeRecord | TreeRecord;
export declare type IntoTreeList = [IntoTreeContent, ...IntoTreeContent[]] | [IntoTreeRecordValue, ...IntoTreeRecordValue[]];
export declare abstract class TreeList extends TreeValue {
    static list(items: IntoTreeList): TreeList;
}
export declare class RecordTreeList extends TreeList {
    #private;
    static is(value: unknown): value is RecordTreeList;
    static of(items: [TreeRecord, ...TreeRecord[]]): RecordTreeList;
    static from(from: RecordTreeList | [IntoTreeRecord | TreeRecord, ...(IntoTreeRecord | TreeRecord)[]]): RecordTreeList;
    private constructor();
    appendTo(treeify: TreeifyObject, label: string): void;
}
/**
 * A TreeList is a list of values without children
 */
export declare class ScalarTreeList extends TreeList {
    #private;
    static is(value: unknown): value is ScalarTreeList;
    static of(items: [TreeContent, ...TreeContent[]]): ScalarTreeList;
    static from(from: ScalarTreeList | [IntoTreeContent, ...IntoTreeContent[]]): ScalarTreeList;
    private constructor();
    appendTo(treeify: TreeifyObject, label: string): void;
}
/**
 * A TreeRecord is a TreeValue that can *also* serve as the root of a tree.
 */
export declare class TreeRecord extends TreeValue {
    #private;
    static is(value: unknown): value is TreeRecord;
    static of(nodes: readonly TreeEntry[]): TreeRecord;
    static from(from: IntoTreeRecord | TreeRecord): TreeRecord;
    private constructor();
    appendTo(treeify: TreeifyObject, label: string): void;
    treeify(): TreeifyObject;
    stringify(): string;
}
export declare type IntoTreeContent = string | TreeContent;
export declare class TreeContent extends TreeValue {
    #private;
    static is(value: unknown): value is TreeContent;
    static from(content: IntoTreeContent): TreeContent;
    static of(atom: string): TreeContent;
    private constructor();
    appendToList(object: TreeifyObject): void;
    appendTo(object: TreeifyObject, label: string): void;
}
export {};
