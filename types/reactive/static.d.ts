import { ExtendsReactive } from "./base.js";
export declare class Static<T> extends ExtendsReactive<T> {
    readonly current: T;
    readonly description: string;
    constructor(current: T, description?: string);
    readonly metadata: import("../core/metadata.js").ConstantMetadata;
}
