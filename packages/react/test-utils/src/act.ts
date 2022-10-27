import { act as reactAct } from "@testing-library/react";

export function act(callback: () => undefined): undefined;
export function act<T>(callback: () => T): T;
export function act<T>(callback: () => T): unknown {
  let value: unknown;

  reactAct(() => {
    value = callback();
  });

  return value;
}
