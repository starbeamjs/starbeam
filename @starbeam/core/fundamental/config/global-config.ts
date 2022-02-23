import { assert } from "../../strippable/core.js";
import type { InferArgument } from "../../../trace-internals/src/wrapper.js";
import {
  ConfigEnvironment,
  type ConfigEnvironmentDelegate,
  type StarbeamEnv,
  type StarbeamInsertion,
  type StarbeamParse,
} from "./config.js";

export const STARBEAM_ENV = Symbol.for("starbeam.config.env");
export type STARBEAM_ENV = typeof STARBEAM_ENV;

interface StarbeamGlobalExtensions {
  [STARBEAM_ENV]?: StarbeamEnv;
}

type StarbeamGlobal = typeof globalThis & StarbeamGlobalExtensions;

const GLOBAL = globalThis as StarbeamGlobal;

class GlobalConfig implements ConfigEnvironmentDelegate<StarbeamEnv> {
  hasConfig(): boolean {
    return Object.isExtensible(globalThis);
  }

  getConfig(): StarbeamEnv {
    assert(
      Object.isExtensible(globalThis),
      `Starbeam does not currently support frozen globals, but we expect this to change.`
    );

    let env = GLOBAL[STARBEAM_ENV];

    if (!env) {
      env = {};
      Object.defineProperty(GLOBAL, STARBEAM_ENV, {
        enumerable: false,
        configurable: true,
        writable: false,
        value: env,
      });
    }

    return env;
  }

  insert(state: StarbeamEnv, insertion: StarbeamInsertion): void {
    (state as InferArgument)[insertion.key] = insertion.value;
  }

  parse(
    state: StarbeamEnv,
    parseKey: StarbeamParse
  ): string | number | boolean | undefined {
    return (state as InferArgument)[parseKey.key];
  }

  description(_state: StarbeamEnv, { key }: StarbeamParse): string {
    return `global[STARBEAM_ENV].${key}`;
  }
}

export const GLOBAL_CONFIG = ConfigEnvironment.create(new GlobalConfig());
