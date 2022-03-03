import { mapObject } from "@starbeam/utils";
import type { InferReturn } from "./types.js";

export type LogLevelName =
  | "trace"
  | "debug"
  | "info"
  | "warn"
  | "error"
  | "bug"
  | "silent";

export enum Priority {
  Inline = "Inline",
  BeforeLayout = "BeforeLayout",
  HighPriority = "HighPriority",
  Auto = "Auto",
  WhenIdle = "WhenIdle",
}

export interface StarbeamEnv {
  LogLevel?: string & LogLevelName;
  TraceFocus?: string;
  DefaultPriority?: string & Priority;
  // log?: boolean;
}

export type PresentStarbeamEnv = Mandatory<StarbeamEnv>;

type RuntimeKeys<S> = {
  [P in keyof S]: S[P] extends string
    ? "string"
    : S[P] extends number
    ? "number"
    : S[P] extends boolean
    ? "boolean"
    : never;
};

type StarbeamRuntimeKeys = RuntimeKeys<Mandatory<StarbeamEnv>>;

type KeysOfType<S, T> = Exclude<
  {
    [P in keyof S]: T extends S[P] ? P : never;
  }[keyof S],
  undefined
>;

export type BooleanConfig = KeysOfType<StarbeamEnv, boolean>;
export type StringConfig = KeysOfType<StarbeamEnv, string>;
export type NumberConfig = KeysOfType<StarbeamEnv, number>;

const KEYS: StarbeamRuntimeKeys = {
  LogLevel: "string",
  TraceFocus: "string",
  DefaultPriority: "string",
};

type Mandatory<T> = {
  [P in keyof T]-?: Exclude<T[P], undefined>;
};

type InsertionFor<Env> = {
  [K in keyof Env]: Env[K] extends string | undefined
    ? { key: K; hint: "string"; value: Env[K] }
    : Env[K] extends number | undefined
    ? { key: K; hint: "number"; value: Env[K] }
    : Env[K] extends boolean | undefined
    ? { key: K; hint: "boolean"; value: Env[K] }
    : never;
}[keyof Env];

type ParseFor<Env> = {
  [K in keyof Env]: Env[K] extends string | undefined
    ? { key: K; hint: "string" }
    : Env[K] extends number | undefined
    ? { key: K; hint: "number" }
    : Env[K] extends boolean | undefined
    ? { key: K; hint: "boolean" }
    : never;
}[keyof Env];

export type StarbeamInsertion =
  | InsertionFor<Mandatory<StarbeamEnv>>
  | { key: string; hint: "string"; value: string }
  | { key: string; hint: "number"; value: number }
  | { key: string; hint: "boolean"; value: boolean };

export type StarbeamParse =
  | ParseFor<Mandatory<StarbeamEnv>>
  | { key: string; hint: "string" }
  | { key: string; hint: "number" }
  | { key: string; hint: "boolean" };

export interface ConfigEnvironmentDelegate<State> {
  hasConfig(): boolean;
  getConfig(): State;

  description(state: State, key: StarbeamParse): string;
  insert(state: State, insertion: StarbeamInsertion): void;
  parse(
    state: State,
    kind: StarbeamParse
  ): string | number | boolean | undefined;
}

export class ConfigEnvironment {
  static create(
    delegate: ConfigEnvironmentDelegate<unknown>
  ): ConfigEnvironment {
    return new ConfigEnvironment(delegate);
  }

  readonly #delegate: ConfigEnvironmentDelegate<unknown>;

  private constructor(delegate: ConfigEnvironmentDelegate<unknown>) {
    this.#delegate = delegate;
  }

  get isPresent(): boolean {
    return this.#delegate.hasConfig();
  }

  config(): StarbeamEnv {
    let state = this.#delegate.getConfig();

    return mapObject(KEYS, (hint, key) =>
      this.#delegate.parse(state, { key, hint })
    ) as InferReturn;
  }

  describe<K extends keyof StarbeamEnv>(key: K): string {
    let state = this.#delegate.getConfig();

    return this.#delegate.description(state, { key, hint: KEYS[key] });
  }

  get<K extends keyof StarbeamEnv>(key: K): StarbeamEnv[K] {
    let state = this.#delegate.getConfig();

    return this.#delegate.parse(state, { key, hint: KEYS[key] }) as InferReturn;
  }

  set<K extends keyof PresentStarbeamEnv>(
    key: K,
    value: PresentStarbeamEnv[K]
  ): void {
    let state = this.#delegate.getConfig();
    let hint = KEYS[key];

    this.#delegate.insert(state, { key, hint, value } as StarbeamInsertion);
  }
}
