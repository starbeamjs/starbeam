interface ImportMeta {
  env: {
    PROD: boolean;
    DEV: boolean;
    STARBEAM_TRACE: boolean;
  };
  assert: (condition: unknown, message: string) => asserts condition;
}

declare module "*.scss";
declare module "*.svg";
