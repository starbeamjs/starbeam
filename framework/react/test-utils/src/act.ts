import { act as reactAct } from "@testing-library/react";

export function act<T>(callback: () => T): T {
  let value: T;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  reactAct(() => {
    value = callback();
  });

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return value! as T;
}
