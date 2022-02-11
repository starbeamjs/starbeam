export declare class Timestamp {
    #private;
    static initial(): Timestamp;
    constructor(timestamp: number);
    gt(other: Timestamp): boolean;
    next(): Timestamp;
}
