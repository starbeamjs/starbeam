import { Cell } from "@starbeam/core";
import { type Description, Desc } from "@starbeam/debug";
import { useMemo } from "preact/hooks";

export function create<T>(Reactive: () => T): T {
  return useSetup(Reactive);
}

function useSetup<T>(setup: () => T): T {
  return useMemo(setup, []);
}

export function createCell<T>(
  value: T,
  description?: string | Description
): Cell<T> {
  const desc = Desc("cell", description);
  return create(() => Cell(value, { description: desc }));
}
