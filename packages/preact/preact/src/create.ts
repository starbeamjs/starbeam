import { useMemo } from "preact/hooks";

export function create<T>(Reactive: () => T): T {
  return useSetup(Reactive);
}

function useSetup<T>(setup: () => T): T {
  return useMemo(setup, []);
}
