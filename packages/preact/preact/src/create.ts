import { Desc, type Description } from "@starbeam/debug";
import { Cell } from "@starbeam/universal";
import { useMemo } from "preact/hooks";

export function create<T>(Reactive: () => T): T {
  return useMemo(Reactive, []);
}

export function createCell<T>(
  value: T,
  description?: string | Description
): Cell<T> {
  const desc = Desc("cell", description);
  return create(() => Cell(value, { description: desc }));
}
