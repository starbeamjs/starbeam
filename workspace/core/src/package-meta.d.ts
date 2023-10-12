import type { StarbeamKey, StarbeamValue } from "./manifest";
import type { PackageJSON } from "./package.js";

export function getPackageMeta<P extends StarbeamKey, T>(
  root: string,
  json: PackageJSON,
  path: P,
  map: (value: StarbeamValue<P>) => T,
): T;
export function getPackageMeta<P extends StarbeamKey>(
  root: string,
  json: PackageJSON,
  path: P,
): StarbeamValue<P>;
