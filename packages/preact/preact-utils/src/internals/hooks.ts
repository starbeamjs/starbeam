// eslint-disable-next-line no-sparse-arrays -- Intentionally use a sparse array here so that the 0th entry isn't enumerated via `map`.
const HOOK_NAMES = [
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
] as const;

type HookName = NonNullable<(typeof HOOK_NAMES)[number]>;

export class HookType {
  readonly #type: number;

  static of(type: number): HookType {
    return new HookType(type);
  }

  private constructor(type: number) {
    this.#type = type;
  }

  /**
   * This is not currently used in the Starbeam codebase, because
   * the Starbeam codebase doesn't use the `hook` option.
   *
   * However, it is part of the complete enumeration of Preact
   * features and will be important once this library is announced
   * for general use.
   *
   * @public
   */
  is(name: HookName): boolean {
    return HOOK_NAMES[this.#type] === name;
  }
}
