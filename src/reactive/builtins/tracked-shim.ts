import { Cell } from "../cell.js";

export type TrackedStorage<T> = Cell<T>;

export function createStorage<T>(
  value: T,
  callback: () => void,
  description = "storage"
): Cell<T> {
  return Cell.create(value, description);
}

export declare function getValue<T>(storage: Cell<T>): T;
export declare function setValue<T>(storage: Cell<T>, value: T): void;
