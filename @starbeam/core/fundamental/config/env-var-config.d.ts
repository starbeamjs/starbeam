/// <reference types="node" resolution-mode="require"/>
import { ConfigEnvironment, type ConfigEnvironmentDelegate, type StarbeamInsertion, type StarbeamParse } from "./config.js";
export declare class EnvVarConfig implements ConfigEnvironmentDelegate<NodeJS.ProcessEnv> {
    static create(): EnvVarConfig;
    hasConfig(): boolean;
    getConfig(): NodeJS.ProcessEnv;
    description(_state: NodeJS.ProcessEnv, { key }: StarbeamParse): string;
    insert(env: NodeJS.ProcessEnv, value: StarbeamInsertion): void;
    parse(env: NodeJS.ProcessEnv, parseKey: StarbeamParse): string | number | boolean | undefined;
}
export declare const ENV_VAR_CONFIG: ConfigEnvironment;
//# sourceMappingURL=env-var-config.d.ts.map