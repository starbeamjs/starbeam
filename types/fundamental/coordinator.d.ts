export declare enum Priority {
    BeforeLayout = "BeforeLayout",
    HighPriority = "HighPriority",
    Auto = "Auto",
    WhenIdle = "WhenIdle"
}
declare type Callback = () => void;
export declare class Work {
    readonly priority: Priority;
    readonly work: Callback;
    static create(priority: Priority, work: Callback): Work;
    private constructor();
}
export declare class Coordinator {
    #private;
    static create(): Coordinator;
    private constructor();
    enqueue(...work: Work[]): void;
}
export declare const COORDINATOR: Coordinator;
export {};
