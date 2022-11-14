import { isEmptyArray } from "./array.js";

type Matches = Record<string, string | undefined> | (string | undefined)[];
const POSITIONAL_MATCHES_OFFSET = 1;

export function Pattern<M extends Matches>(
  pattern: RegExp
): {
  match: (input: string) => M;
} {
  return {
    match(input: string): M {
      return matchPattern(pattern, input);
    },
  };
}

const NO_MATCHES = new RegExp("").exec("") as RegExpMatchArray;

export function matchPattern<M extends Matches>(
  pattern: RegExp,
  value: string
): M {
  const match = pattern.exec(value) ?? NO_MATCHES;
  const target = {
    match,
    groups: match.groups ?? {},
    [Symbol.for("nodejs.util.inspect.custom")]: () => {
      return {
        captures: match.slice(POSITIONAL_MATCHES_OFFSET),
        groups: match.groups,
      };
    },
  };

  return new Proxy(target, {
    ownKeys({ match }) {
      return Reflect.ownKeys(match.groups ?? {});
    },

    getOwnPropertyDescriptor({ groups }, prop) {
      const group = Reflect.get(groups, prop) as unknown;

      if (group !== undefined) {
        return {
          configurable: true,
          enumerable: true,
          value: group,
          writable: false,
        };
      }
    },

    get({ match }, property) {
      if (property === Symbol.iterator) {
        return function* () {
          for (const item of match.slice(POSITIONAL_MATCHES_OFFSET)) {
            yield item;
          }
        };
      }

      if (typeof property === "symbol") {
        return Reflect.get(target, property) as unknown;
      }

      const groups = match.groups;

      if (groups && Reflect.has(groups, property)) {
        return Reflect.get(groups, property) as unknown;
      } else {
        return Reflect.get(target, property) as unknown;
      }
    },
  }) as unknown as M;
}

export function isEmptyMatch(match: Matches): boolean {
  return isEmptyArray(match as unknown[]);
}
