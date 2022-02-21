declare const STARBEAM_ENV: unique symbol;
declare type STARBEAM_ENV = typeof STARBEAM_ENV;
export {};
interface StarbeamGlobalExtensions {
    [STARBEAM_ENV]?: StarbeamEnv;
}
declare type StarbeamGlobal = typeof globalThis & StarbeamGlobalExtensions;
interface StarbeamEnv {
    LogLevel: "trace" | "debug" | "info" | "warn" | "error" | "bug" | "silent";
}
/**
 * @strip.replace
 */
export declare const GLOBAL: StarbeamGlobal;
//# sourceMappingURL=global.d.ts.map