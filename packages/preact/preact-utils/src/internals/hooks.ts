export interface HookTypes {
  useState: 1;
  useReducer: 2;
  useEffect: 3;
  useLayoutEffect: 4;
  useRef: 5;
  useImperativeHandle: 6;
  useMemo: 7;
  useCallback: 8;
  useContext: 9;
  useErrorBoundary: 10;
  // Not a real hook, but the devtools treat is as such
  useDebugvalue: 11;
}
export type HookName = keyof HookTypes;

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
  static of(type: number): HookType {
    return new HookType(type);
  }

  readonly #type: number;

  private constructor(type: number) {
    this.#type = type;
  }

  is(name: HookName): boolean {
    return HOOK_NAMES[this.#type] === name;
  }
}
