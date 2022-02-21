export declare const FRAMES_TO_REMOVE = 3;
export declare let CURRENT_FRAMES_TO_REMOVE: number | null;
export declare class Abstraction {
    #private;
    static default(): Abstraction;
    static start(): number | null;
    static end(start: number | null, error: Error): never;
    static end(start: number | null): void;
    static callerFrame(frames?: number): string;
    static throw(message: string): never;
    static not(callback: () => void, _frames?: number): void;
    static throws(callback: () => void, frames?: number): void;
    static wrap<T>(callback: () => T, frames?: number): T;
    private constructor();
}
//# sourceMappingURL=abstraction.d.ts.map