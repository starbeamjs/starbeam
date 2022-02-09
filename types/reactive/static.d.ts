import type { AbstractReactive } from "./core.js";
import { HasMetadata } from "./metadata.js";
export declare class Static<T> extends HasMetadata implements AbstractReactive<T> {
    readonly current: T;
    readonly description: string;
    constructor(current: T, description?: string);
    readonly metadata: import("./metadata.js").ConstantMetadata;
}
