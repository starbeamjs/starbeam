import "vitest/importMeta.js";
import "vite/client";

declare global {
  // https://vitejs.dev/guide/env-and-mode.html#intellisense-for-typescript
  interface ImportMetaEnv {
    readonly CJS: boolean;
    readonly ESM: boolean;
    readonly PROD: boolean | "";
    readonly DEV: boolean | "";
    readonly STARBEAM_TRACE: boolean;
  }

  interface ImportMeta {
    env: ImportMetaEnv;
    assert: (condition: unknown, message: string) => asserts condition;
  }
}

declare module "*.scss" {
  const DEFAULT: Record<string, string | undefined>;
  export default DEFAULT;
}
declare module "*.svg";

declare module "*?inline" {
  const content: string;
  export default content;
}
