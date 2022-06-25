/// <reference types="vite/client" />

declare global {
  interface StarbeamShellEnv extends ImportMetaEnv {
    // additional env vars here
    DEBUG: boolean;
  }

  interface ImportMeta {
    readonly env: StarbeamShellEnv;
  }
}
