import { compile } from "@starbeam-dev/compile";

export default compile(import.meta).map((config) => ({
  ...config,
  output: {
    ...config.output,
    sourcemapExcludeSources: true,
  },
}));
