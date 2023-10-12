import type { JsonObject } from "./json";
import type { InlineRules, Strictness } from "./types";

export type StarbeamKey = keyof NonNullable<StarbeamJSON["starbeam"]>;
export type StarbeamValue<K extends StarbeamKey> =
  StarbeamJSON[`starbeam:${K}`];

export type ReportItem = "externals:fallback";

export interface StrictSettings {
  readonly externals: "explicit";
}

export type StarbeamJSON = StarbeamRecord<{
  readonly inline?: InlineRules | undefined;
  readonly strict?:
    | {
        readonly "all.v1"?: Strictness;
        readonly externals?: Strictness | undefined;
      }
    | undefined;
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
