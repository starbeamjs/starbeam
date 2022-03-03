import {
  ConfigEnvironment,
  type ConfigEnvironmentDelegate,
  type StarbeamInsertion,
  type StarbeamParse,
} from "./config.js";
import { assert, exhaustive, type InferReturn } from "./types.js";

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
    return `process.env.${configToEnv(key)}`;
  }

  insert(env: NodeJS.ProcessEnv, value: StarbeamInsertion): void {
    switch (value.hint) {
      case "boolean":
      case "number":
        env[configToEnv(value.key)] = String(value.value);
        break;
      case "string":
        env[configToEnv(value.key)] = value.value;
        break;
      default:
        exhaustive(value);
    }
  }

  parse(
    env: NodeJS.ProcessEnv,
    parseKey: StarbeamParse
  ): string | number | boolean | undefined {
    let key = configToEnv(parseKey.key);

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

function configToEnv<S extends string>(key: S): `STARBEAM_${SnakeCase<S>}` {
  return `STARBEAM_${snakeCase(key)}`;
}

const PREFIX_LENGTH = "STARBEAM_".length;

function envToConfig<S extends `STARBEAM_${string}`>(
  key: S
): S extends `STARBEAM_${infer K}` ? PascalCase<K> : never {
  const rest = key.slice(PREFIX_LENGTH);
  return pascalCase(rest) as InferReturn;
}

function snakeCase<S extends string>(string: S): SnakeCase<S> {
  return string
    .replace(/([A-Z][A-Z][a-z])/g, `$1_$2$3`)
    .replace(/([a-z])([A-Z])/g, `$1_$2`)
    .toUpperCase() as SnakeCase<S>;
}

function pascalCase<S extends string>(string: S): PascalCase<S> {
  return string.replace(
    /(\w)(\w*)/g,
    (g0, g1: string, g2: string) => g1.toUpperCase() + g2.toLowerCase()
  ) as InferReturn;
}

type PascalCase<T, SoFar extends string = ""> =
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

type SnakeCase<
  Tail extends string,
  SoFar extends string = ""
> = true extends IsWideString<Tail>
  ? string
  : true extends IsEmpty<Tail> // we're at the end
  ? SoFar
  : Tail extends `${infer A}${infer B}${infer C}${infer Rest}`
  ? SnakeCase<
      `${B}${C}${Rest}`,
      `${SoFar}${Uppercase<A>}${MaybeBoundary<A, B, C>}`
    >
  : Tail extends `${infer A}${infer B}${infer Rest}`
  ? SnakeCase<
      `${B}${Rest}`,
      `${SoFar}${Uppercase<A>}${MaybeBoundary<A, B, "">}`
    >
  : Tail extends `${infer A}${infer Rest}`
  ? SnakeCase<Rest & string, `${SoFar}${Uppercase<A>}`>
  : never;

type IsWideString<S extends string> = string extends S ? true : false;
type IsEmpty<S extends string> = S extends "" ? true : false;

type MaybeBoundary<
  A extends string,
  B extends string,
  C extends string
> = true extends IsEmpty<A>
  ? ""
  : true extends IsNextBoundary<A, B, C>
  ? "_"
  : "";

type IsNextBoundary<
  A extends string,
  B extends string,
  C extends string
> = true extends IsEmpty<B>
  ? false
  : true extends IsEmpty<A>
  ? false
  : false extends IsUppercase<A>
  ? true extends IsUppercase<B>
    ? true
    : false
  : true extends IsUppercase<A>
  ? true extends IsUppercase<B>
    ? false extends IsUppercase<C>
      ? true
      : false
    : false
  : false;

type IsUppercase<S extends string> = true extends IsEmpty<S>
  ? false
  : S extends Uppercase<S>
  ? true
  : false;
