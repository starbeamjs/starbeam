import type { JsonObject } from "./json";

export type ExternalOperator = "startsWith" | "scope";
export type InlineRules = string | [ExternalOperator, string];

export type StarbeamKey = "inline" | "type" | "jsx";

export type StarbeamJSON = StarbeamRecord<{
  readonly inline?: InlineRules[] | undefined;
  readonly source?: string | undefined;
  readonly type?: string | undefined;
  readonly jsx?: string | undefined;
  readonly entry?: string | Record<string, string> | undefined;
}>;

export interface PackageJSON extends StarbeamJSON {
  readonly main: string;
  readonly private: boolean;
  readonly name: string;
}

type StarbeamRecord<T extends JsonObject> = {
  readonly starbeam?: {
    readonly [P in keyof T]?: T[P];
  };
} & {
  readonly [P in keyof T as PrefixedKey<P>]?: T[P];
};

type PrefixedKey<P extends PropertyKey> = P extends string
  ? `starbeam:${P}`
  : never;
