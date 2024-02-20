import { getCoordination } from "./env.js";

const coordination = getCoordination();

let stack = coordination.stack;

if (!stack) {
  let current = new Set<object>();

  stack = coordination.stack = {
    start: () => {
      const prev = current;
      current = new Set();

      return () => {
        const result = current;
        current = prev;
        return result;
      };
    },
    consume: (tag: object) => void current.add(tag),
  };
}

const STACK = stack;

export function start(): () => Set<object> {
  return STACK.start();
}

export function consume(tag: object): void {
  STACK.consume(tag);
}
