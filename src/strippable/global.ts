const STARBEAM_ENV = Symbol.for("starbeam.config.env");
type STARBEAM_ENV = typeof STARBEAM_ENV;

export {};

interface StarbeamGlobalExtensions {
  [STARBEAM_ENV]?: StarbeamEnv;
}

type StarbeamGlobal = typeof globalThis & StarbeamGlobalExtensions;

interface StarbeamEnv {
  LogLevel: "trace" | "debug" | "info" | "warn" | "error" | "bug" | "silent";
}

/**
 * @strip.replace
 */
export const GLOBAL = globalThis as StarbeamGlobal;
