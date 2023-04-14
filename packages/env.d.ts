import "vitest/importMeta.js";
import "vite/client";

interface ImportMeta {
  env: {
    PROD: boolean | "";
    DEV: boolean | "";
    STARBEAM_TRACE: boolean;
  };
  assert: (condition: unknown, message: string) => asserts condition;
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
