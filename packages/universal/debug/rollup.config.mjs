import { compile } from "@starbeam-dev/compile";

const config = compile(import.meta);

console.log(config);

export default config;
