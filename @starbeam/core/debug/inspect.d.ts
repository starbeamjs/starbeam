export declare const DEBUG: unique symbol;
declare class Buffer {
    #private;
    static empty(): Buffer;
    static serialize(buffer: Buffer): string;
    constructor(buffer: string, indents: number);
    start(): void;
    end(): void;
    fragment(contents: string): void;
    indent(): void;
    outdent(): void;
}
export declare class ContentBuilder {
    #private;
    static empty(): ContentBuilder;
    static serialize(builder: ContentBuilder): string;
    static finalize(builder: ContentBuilder): Content;
    constructor(content: Atom[]);
    readonly line: {
        readonly start: (content?: string | undefined) => ContentBuilder;
        readonly end: (content: string) => ContentBuilder;
        readonly next: (content: string) => ContentBuilder;
        readonly new: () => ContentBuilder;
    };
    debug(value: unknown): ContentBuilder;
    add(content: Content): ContentBuilder;
    mapped<T>(items: Iterable<T>, mapper: (builder: ContentBuilder, value: T) => ContentBuilder): ContentBuilder;
    nest(callback: (builder: ContentBuilder) => ContentBuilder): ContentBuilder;
    fragment(content: string): ContentBuilder;
    serialize(): string;
}
interface Content {
    append(buffer: Buffer): void;
    readonly atoms: readonly Atom[];
}
declare class StartLine implements Content {
    append(buffer: Buffer): void;
    readonly atoms: this[];
}
declare class EndLine implements Content {
    append(buffer: Buffer): void;
    readonly atoms: this[];
}
declare class Fragment implements Content {
    readonly contents: string;
    constructor(contents: string);
    append(buffer: Buffer): void;
    readonly atoms: this[];
}
declare type Atom = Fragment | StartLine | EndLine;
export declare function content(string: string): Content;
export interface Debug {
    [DEBUG](builder: ContentBuilder): ContentBuilder;
}
export declare function debug(value: unknown): string;
export {};
//# sourceMappingURL=inspect.d.ts.map