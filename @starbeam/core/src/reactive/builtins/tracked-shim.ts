import { ReactiveCell } from "../cell.js";

export type TrackedStorage<T> = ReactiveCell<T>;

export function createStorage<T>(
  value: T,
  callback: () => void,
  description = "storage"
): ReactiveCell<T> {
  return ReactiveCell.create(value, description);
}

export function getValue<T>(storage: ReactiveCell<T>): T {
  return storage.current;
}

export function setValue<T>(storage: ReactiveCell<T>, value: T): void {
  storage.update(value);
}
