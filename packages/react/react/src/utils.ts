import { Cell } from "@starbeam/core";
import { type Description, Desc } from "@starbeam/debug";
import { UNINITIALIZED } from "@starbeam/shared";
import type { Reactive } from "@starbeam/timeline";
import { useRef } from "react";

export interface Deps {
  consume: () => void;
  debug: () => Reactive<unknown>[];
}

/**
 * Convert a React hooks dependency list into a reactive
 */
export function useDeps<T extends unknown[] | undefined>(
  deps: T,
  description?: string | Description
): Deps | undefined {
  const desc = Desc("external", description);

  if (deps && deps.length) {
    const dependencies = deps.map((dep, i) => useProp(dep, desc.index(i)));
    return {
      consume: () => dependencies.forEach((dep) => dep.read()),
      debug: () => dependencies,
    };
  }
}

export function useProp<T>(
  variable: T,
  description?: string | Description
): Reactive<T> {
  const ref = useRef(UNINITIALIZED as UNINITIALIZED | Cell<T>);

  if (ref.current === UNINITIALIZED) {
    ref.current = Cell(variable, {
      description: Desc("external", description),
    });
  } else {
    ref.current.set(variable);
  }

  return ref.current;
}
