import { act as reactAct } from "@testing-library/react";
import { unstable_next } from "scheduler";

export async function act(callback: () => undefined): Promise<void>;
export async function act<T>(callback: () => T): Promise<T>;
export async function act<T>(callback: () => T): Promise<unknown> {
  let value: unknown;

  reactAct(() => {
    value = callback();
  });

  await new Promise<void>((fulfill) => {
    unstable_next(() => void fulfill());
  });

  return value;
}
