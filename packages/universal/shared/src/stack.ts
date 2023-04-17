import { getCoordination } from "./env.js";

const coordination = getCoordination();

let stack = coordination.stack;

if (!stack) {
  let current: null | unknown[] = null;

  stack = coordination.stack = {
    start: () => {
      const prev = current;
      current = [];

      return () => {
        const result = current;
        current = prev;
        return result ?? [];
      };
    },
    consume: (tag: unknown) => void current?.push(tag),
  };
}

const STACK = stack;

export function start(): () => unknown[] {
  return STACK.start();
}

export function consume(tag: unknown): void {
  STACK.consume(tag);
}
