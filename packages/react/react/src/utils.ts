import type { Description, Reactive } from "@starbeam/interfaces";
import { DEBUG } from "@starbeam/reactive";
import { UNINITIALIZED } from "@starbeam/shared";
import { Cell } from "@starbeam/universal";
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
  description?: string | Description | undefined
): Deps | undefined {
  const desc = DEBUG?.Desc("cell", description, "useDeps");

  if (deps?.length) {
    const dependencies = deps.map((dep, i) => useProp(dep, desc?.index(i)));
    return {
      consume: () => {
        dependencies.forEach((dep) => dep.read());
      },
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
      description: DEBUG?.Desc("cell", description, "useProp"),
    });
  } else {
    ref.current.set(variable);
  }

  return ref.current;
}
