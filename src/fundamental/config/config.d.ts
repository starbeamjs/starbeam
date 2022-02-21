export declare type LogLevelName = "trace" | "debug" | "info" | "warn" | "error" | "bug" | "silent";
export interface StarbeamEnv {
    LogLevel?: string & LogLevelName;
    TraceFocus?: string;
}
export declare type PresentStarbeamEnv = Mandatory<StarbeamEnv>;
declare type KeysOfType<S, T> = Exclude<{
    [P in keyof S]: T extends S[P] ? P : never;
}[keyof S], undefined>;
export declare type BooleanConfig = KeysOfType<StarbeamEnv, boolean>;
export declare type StringConfig = KeysOfType<StarbeamEnv, string>;
export declare type NumberConfig = KeysOfType<StarbeamEnv, number>;
declare type Mandatory<T> = {
    [P in keyof T]-?: Exclude<T[P], undefined>;
};
declare type InsertionFor<Env> = {
    [K in keyof Env]: Env[K] extends string | undefined ? {
        key: K;
        hint: "string";
        value: Env[K];
    } : Env[K] extends number | undefined ? {
        key: K;
        hint: "number";
        value: Env[K];
    } : Env[K] extends boolean | undefined ? {
        key: K;
        hint: "boolean";
        value: Env[K];
    } : never;
}[keyof Env];
declare type ParseFor<Env> = {
    [K in keyof Env]: Env[K] extends string | undefined ? {
        key: K;
        hint: "string";
    } : Env[K] extends number | undefined ? {
        key: K;
        hint: "number";
    } : Env[K] extends boolean | undefined ? {
        key: K;
        hint: "boolean";
    } : never;
}[keyof Env];
export declare type StarbeamInsertion = InsertionFor<Mandatory<StarbeamEnv>> | {
    key: string;
    hint: "string";
    value: string;
} | {
    key: string;
    hint: "number";
    value: number;
} | {
    key: string;
    hint: "boolean";
    value: boolean;
};
export declare type StarbeamParse = ParseFor<Mandatory<StarbeamEnv>> | {
    key: string;
    hint: "string";
} | {
    key: string;
    hint: "number";
} | {
    key: string;
    hint: "boolean";
};
export interface ConfigEnvironmentDelegate<State> {
    hasConfig(): boolean;
    getConfig(): State;
    description(state: State, key: StarbeamParse): string;
    insert(state: State, insertion: StarbeamInsertion): void;
    parse(state: State, kind: StarbeamParse): string | number | boolean | undefined;
}
export declare class ConfigEnvironment {
    #private;
    static create(delegate: ConfigEnvironmentDelegate<unknown>): ConfigEnvironment;
    private constructor();
    get isPresent(): boolean;
    config(): StarbeamEnv;
    describe<K extends keyof StarbeamEnv>(key: K): string;
    get<K extends keyof StarbeamEnv>(key: K): StarbeamEnv[K];
    set<K extends keyof PresentStarbeamEnv>(key: K, value: PresentStarbeamEnv[K]): void;
}
export {};
//# sourceMappingURL=config.d.ts.map