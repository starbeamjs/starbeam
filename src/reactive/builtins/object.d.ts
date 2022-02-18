import type { Entries, EntriesToObject, Entry } from "./type-magic.js";
export default class TrackedObject {
    #private;
    static fromEntries<E extends Entries>(entries: E): EntriesToObject<E>;
    static fromEntries(entries: readonly Entry[]): object;
    constructor(obj?: object);
}
