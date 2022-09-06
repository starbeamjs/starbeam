import { Cell, Marker } from "@starbeam/core";
import type { Stack } from "@starbeam/debug";
import {
  type Description,
  callerStack,
  descriptionFrom,
} from "@starbeam/debug";
import { reactive } from "@starbeam/js";
import { getID } from "@starbeam/peer";
import type { Reactive } from "@starbeam/timeline";
import { useUpdatingVariable } from "@starbeam/use-strict-lifecycle";
import type { Dispatch, SetStateAction } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<PropertyKey, any>;

/**
 * Convert a React hooks dependency list into a reactive
 */
export function useDeps<T extends unknown[]>(
  deps: T,
  description?: string | Description
): { consume: () => void; debug: () => Reactive<unknown>[] } {
  const desc = descriptionFrom({
    type: "external",
    id: getID(),
    api: {
      name: "useDeps",
      package: "@starbeam/react",
    },
    fromUser: description,
  });

  const dependencies = deps.map((d, i) => useProp(d, desc.index(i)));

  return {
    debug: (): Reactive<unknown>[] => {
      return dependencies;
    },

    consume: () => {
      dependencies.forEach((d) => d.read());
    },
  };
}

export function useProp<T>(
  variable: T,
  description?: string | Description
): Reactive<T> {
  const desc = descriptionFrom({
    type: "external",
    id: getID(),
    api: "useProp",
    fromUser: description,
  });

  return useUpdatingVariable({
    initial: () => {
      return Cell(variable, { description: desc });
    },
    update: (cell) => {
      cell.set(variable);
    },
  });
}

export function useProps<T extends AnyRecord>(
  props: T,
  description?: string | Description
): T {
  const desc = descriptionFrom({
    type: "external",
    id: getID(),
    api: "useProps",
    fromUser: description,
  });

  return useUpdatingVariable({
    initial: () => reactive.object(props, desc),
    update: (stableProps) => {
      Object.assign(stableProps, props);
    },
  });
}

type SetValue<T> = Dispatch<SetStateAction<T>>;

export class ReactiveState<T> {
  static create<T>(
    value: T,
    setValue: SetValue<T>,
    description: Description
  ): ReactiveState<T> {
    return new ReactiveState(value, setValue, Marker(description));
  }

  static update<T>(state: ReactiveState<T>, value: T, caller: Stack): void {
    if (value !== state.#value) {
      state.#value = value;
      state.#marker.update(caller);
    }
  }

  #value: T;
  readonly #setValue: SetValue<T>;
  readonly #marker: Marker;

  private constructor(value: T, setValue: SetValue<T>, marker: Marker) {
    this.#value = value;
    this.#setValue = setValue;
    this.#marker = marker;
  }

  get current(): T {
    this.#marker.consume(callerStack());
    return this.#value;
  }

  set current(value: T) {
    this.#value = value;
    this.#setValue(value);
    this.#marker.update(callerStack());
  }

  update(updater: (value: T) => T): void {
    this.current = updater(this.#value);
  }
}
