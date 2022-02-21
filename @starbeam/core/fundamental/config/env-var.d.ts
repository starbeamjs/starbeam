import type { StarbeamConfig } from "./def.js";
import type { TuplifyUnion } from "./type-magic.js";
export declare type SerializedArray<F extends string, T extends string> = `${F},${T}`;
export declare type SerializedObject<K extends string, V extends string, Rest extends string> = `[${K}]=${V},${Rest}`;
export declare type EnvVars<Env> = {
    [P in keyof Env as EnvKey<Env, P & string>]: IntoEnvVar<P, Env[P]>;
};
export declare type EnvKey<Env, Key extends keyof Env = keyof Env> = {
    [P in Key]: Env[P] extends EnvVarLeaf ? SnakeCase<P & string> : never;
}[Key];
export declare type EnvKeys<Env, Key extends keyof Env = keyof Env> = TuplifyUnion<EnvKey<Env, Key>>;
export declare function envVarConfig(): StarbeamConfig;
declare type SnakeCase<T extends string, P extends string = ""> = string extends T ? string : "" extends P ? T extends `${infer F}${infer Rest}` ? SnakeCase<Rest, F> : T : T extends `${infer C0}${infer R}` ? Uppercase<C0> extends C0 ? SnakeCase<R, `${P}_${C0}`> : SnakeCase<R, `${P}${Uppercase<C0>}`> : P;
declare type EnvVarLeaf = string | number | boolean;
declare type IntoEnvVar<P, T> = T extends EnvVarLeaf ? `${T}` : P extends string | number ? `StarbeamConfig.${P} is an invalid configuration type (allowed: string, number, boolean)` : P extends symbol ? `symbols are invalid keys in StarbeamConfig` : never;
export {};
//# sourceMappingURL=env-var.d.ts.map