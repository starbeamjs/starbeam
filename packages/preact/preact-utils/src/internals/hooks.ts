export enum HookTypes {
  useState = 1,
  useReducer = 2,
  useEffect = 3,
  useLayoutEffect = 4,
  useRef = 5,
  useImperativeHandle = 6,
  useMemo = 7,
  useCallback = 8,
  useContext = 9,
  useErrorBoundary = 10,
  // Not a real hook, but the devtools treat is as such
  useDebugValue = 11,
}

export type HookName = keyof HookTypes;

/**
 * Intentionally use a sparse array here so that the 0th entry isn't enumerated via `map`.
 */
// eslint-disable-next-line no-sparse-arrays
export const HOOK_NAMES = [
  ,
  "useState",
  "useReducer",
  "useEffect",
  "useLayoutEffect",
  "useRef",
  "useImperativeHandle",
  "useMemo",
  "useCallback",
  "useContext",
  "useErrorBoundary",
  "useDebugvalue",
];

export class HookType {
  readonly #type: number;

  static of(type: number): HookType {
    return new HookType(type);
  }

  private constructor(type: number) {
    this.#type = type;

    if (import.meta.env.DEV) {
      Object.defineProperty(this, "name", {
        value: HOOK_NAMES[type],
      });
    }
  }

  is(name: HookName): boolean {
    return HOOK_NAMES[this.#type] === name;
  }
}
