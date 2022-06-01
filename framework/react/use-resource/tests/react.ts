import { act as reactAct } from "@testing-library/react";

export function act<T>(callback: () => T): T {
  let value: T;

  reactAct(() => {
    value = callback();
  });

  return value! as T;
}
