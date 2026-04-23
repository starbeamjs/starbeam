import type { Description, Reactive } from "@starbeam/interfaces";
import { DEBUG } from "@starbeam/reactive";
import { UNINITIALIZED } from "@starbeam/shared";
import { Cell } from "@starbeam/universal";
import { useRef, useState } from "react";

export function useProp<T>(
  variable: T,
  description?: string | Description,
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

export function sameDeps(
  next: readonly unknown[] | undefined,
  prev: readonly unknown[] | undefined,
): boolean {
  if (prev === undefined || next === undefined) {
    return prev === next;
  }

  if (prev.length !== next.length) {
    return false;
  }

  return prev.every((value, index) => Object.is(value, next[index]));
}

/**
 * Returns a function that can be called to notify React that the current
 * component should be re-rendered.
 */
export function useNotify(): () => void {
  const [, setNotify] = useState({});
  return () => void setNotify({});
}
