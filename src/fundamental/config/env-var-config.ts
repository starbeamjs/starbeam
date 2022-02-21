import { exhaustive } from "../../strippable/assert.js";
import { assert } from "../../strippable/core.js";
import type { InferReturn } from "../../strippable/wrapper.js";
import {
  ConfigEnvironment,
  type ConfigEnvironmentDelegate,
  type StarbeamInsertion,
  type StarbeamParse,
} from "./config.js";
import type { StarbeamConfig } from "./def.js";
import type { TuplifyUnion } from "./type-magic.js";

export type SerializedArray<F extends string, T extends string> = `${F},${T}`;

export type SerializedObject<
  K extends string,
  V extends string,
  Rest extends string
> = `[${K}]=${V},${Rest}`;

export type EnvKey<Env, Key extends keyof Env = keyof Env> = {
  [P in Key]: Env[P] extends EnvVarLeaf ? SnakeCase<P & string> : never;
};

export type EnvKeys<Env, Key extends keyof Env = keyof Env> = TuplifyUnion<
  EnvKey<Env, Key>
>;

function keys(keys: EnvKey<StarbeamConfig>): EnvKey<StarbeamConfig> {
  return keys;
}

const KEYS = keys({
  LogLevel: "LOG_LEVEL",
  TraceFocus: "TRACE_FOCUS",
});

export class EnvVarConfig
  implements ConfigEnvironmentDelegate<NodeJS.ProcessEnv>
{
  static create(): EnvVarConfig {
    return new EnvVarConfig();
  }

  hasConfig(): boolean {
    return "process" in globalThis && !!globalThis.process.env;
  }

  getConfig(): NodeJS.ProcessEnv {
    assert(
      "process" in globalThis && !!globalThis.process.env,
      `Expected configuration in node process (because hasConfig() returned true), but process.env was missing. Did you call getConfig() without first calling hasConfig()?`
    );

    return globalThis.process.env;
  }

  description(_state: NodeJS.ProcessEnv, { key }: StarbeamParse): string {
    return `process.env.${pascalCase(key)}`;
  }

  insert(env: NodeJS.ProcessEnv, value: StarbeamInsertion): void {
    switch (value.hint) {
      case "boolean":
      case "number":
        env[pascalCase(value.key)] = String(value.value);
        break;
      case "string":
        env[pascalCase(value.key)] = value.value;
        break;
      default:
        exhaustive(value);
    }
  }

  parse(
    env: NodeJS.ProcessEnv,
    parseKey: StarbeamParse
  ): string | number | boolean | undefined {
    let key = pascalCase(parseKey.key);

    switch (parseKey.hint) {
      case "boolean": {
        return key in env && env[key] !== "false";
      }
      case "number": {
        let number = env[key];
        return number === undefined ? undefined : Number(number);
      }
      case "string": {
        return env[key];
      }
      default:
        exhaustive(parseKey);
    }
  }
}

export const ENV_VAR_CONFIG = ConfigEnvironment.create(EnvVarConfig.create());

function pascalCase<S extends string>(string: S): PascalCase<S> {
  return string.replace(
    /(\w)(\w*)/g,
    (g0, g1: string, g2: string) => g1.toUpperCase() + g2.toLowerCase()
  ) as InferReturn;
}

type SnakeCase<T extends string, P extends string = ""> = string extends T
  ? string
  : "" extends P
  ? T extends `${infer F}${infer Rest}`
    ? SnakeCase<Rest, F>
    : T
  : T extends `${infer C0}${infer R}`
  ? Uppercase<C0> extends C0
    ? SnakeCase<R, `${P}_${C0}`>
    : SnakeCase<R, `${P}${Uppercase<C0>}`>
  : P;

type PascalCase<T extends string, SoFar extends string = ""> =
  // CamelCase<string> => string
  string extends T
    ? string
    : // If this is the first character, capitalize it
    "" extends SoFar
    ? T extends `${infer F}${infer Rest}`
      ? PascalCase<Rest, F>
      : never
    : // Otherwise, if the next character is `_`, the next-next character should be capitalized
    T extends `_${infer F}${infer Rest}`
    ? PascalCase<Rest, `${SoFar}${F}`>
    : // Otherwise, the next character should be lowercased
    T extends `${infer F}${infer Rest}`
    ? PascalCase<Rest, `${SoFar}${Lowercase<F>}`>
    : // If we have no characters left, we've accumulated everything into SoFar
      SoFar;

type EnvVarLeaf = string | number | boolean;
