export type ExternalOperator = "startsWith" | "scope";
export type PackageJsonInline = string | [ExternalOperator, string];

export type StarbeamKey = "inline" | "type" | "jsx";

export interface PackageJSON {
  readonly main: string;
  readonly private: boolean;
  readonly name: string;
  readonly "starbeam:inline"?: PackageJsonInline[] | undefined;
  readonly "starbeam:type"?: string | undefined;
  readonly "starbeam:jsx"?: string | undefined;
  readonly "starbeam:source"?: string | undefined;
  readonly "starbeam:entry"?: string | Record<string, string> | undefined;
  readonly starbeam?:
    | {
        readonly inline?: PackageJsonInline[] | undefined;
        readonly source?: string | undefined;
        readonly type?: string | undefined;
        readonly jsx?: string | undefined;
        readonly entry?: string | Record<string, string> | undefined;
      }
    | undefined;
}
