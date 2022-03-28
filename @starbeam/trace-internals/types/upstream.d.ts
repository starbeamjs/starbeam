declare module "picomatch-browser" {
  import picomatch from "picomatch";
  export const makeRe: typeof picomatch["makeRe"];
}
