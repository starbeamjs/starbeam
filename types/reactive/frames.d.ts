export declare class FrameSubscriber<T> {
    #private;
    static create<T>(produce: () => T, description: string): {
        subscribe(callback: () => void): FrameSubscriber<T>;
    };
    private constructor();
    link(parent: object): this;
    poll(): T;
}
export declare const Frame: typeof FrameSubscriber.create;
