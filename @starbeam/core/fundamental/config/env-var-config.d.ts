/// <reference types="node" resolution-mode="require"/>
import { ConfigEnvironment, type ConfigEnvironmentDelegate, type StarbeamInsertion, type StarbeamParse } from "./config.js";
import type { TuplifyUnion } from "./type-magic.js";
export declare type SerializedArray<F extends string, T extends string> = `${F},${T}`;
export declare type SerializedObject<K extends string, V extends string, Rest extends string> = `[${K}]=${V},${Rest}`;
export declare type EnvKey<Env, Key extends keyof Env = keyof Env> = {
    [P in Key]: Env[P] extends EnvVarLeaf ? SnakeCase<P & string> : never;
};
export declare type EnvKeys<Env, Key extends keyof Env = keyof Env> = TuplifyUnion<EnvKey<Env, Key>>;
export declare class EnvVarConfig implements ConfigEnvironmentDelegate<NodeJS.ProcessEnv> {
    static create(): EnvVarConfig;
    hasConfig(): boolean;
    getConfig(): NodeJS.ProcessEnv;
    description(_state: NodeJS.ProcessEnv, { key }: StarbeamParse): string;
    insert(env: NodeJS.ProcessEnv, value: StarbeamInsertion): void;
    parse(env: NodeJS.ProcessEnv, parseKey: StarbeamParse): string | number | boolean | undefined;
}
export declare const ENV_VAR_CONFIG: ConfigEnvironment;
declare type SnakeCase<T extends string, P extends string = ""> = string extends T ? string : "" extends P ? T extends `${infer F}${infer Rest}` ? SnakeCase<Rest, F> : T : T extends `${infer C0}${infer R}` ? Uppercase<C0> extends C0 ? SnakeCase<R, `${P}_${C0}`> : SnakeCase<R, `${P}${Uppercase<C0>}`> : P;
declare type EnvVarLeaf = string | number | boolean;
export {};
//# sourceMappingURL=env-var-config.d.ts.map