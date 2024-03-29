import type { Testing } from "./env.js";
import { getCoordination } from "./env.js";

const coordination = getCoordination();

export function testing(options: Partial<Testing>): void {
  coordination.testing = coordination.testing ?? {};
  Object.assign(coordination.testing, options);
}
