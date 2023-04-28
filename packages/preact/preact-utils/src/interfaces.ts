import type { ComponentChild, Options } from "preact";

import type { InternalPreactComponent } from "./internals/component.js";
import type { InternalPreactVNode } from "./internals/vnode.js";
import type { HOOK_NAMES } from "./plugin.js";

export interface RawPreactOptions extends Options {
  _hook?: Hook<
    [component: InternalPreactComponent, index: number, type: number]
  >;
  __h?: Hook<[component: InternalPreactComponent, index: number, type: number]>;

  _catchError?: CatchErrorHook;
  __e?: CatchErrorHook;

  _root?: RootHook;
  __?: RootHook;

  _diff?: Hook;
  __b?: Hook;
  _render?: Hook;
  __r?: Hook;

  _commit?: Hook;
  __c?: Hook;
}

export type MangledHookNames = (typeof HOOK_NAMES)[keyof typeof HOOK_NAMES];
export type PrivateHookNames = keyof typeof HOOK_NAMES;

type Hook<Args extends unknown[] = [vnode: InternalPreactVNode]> = (
  ...args: Args
) => void;

type RootHook = Hook<[child: ComponentChild, parent: InternalPreactElement]>;

type CatchErrorHook = Hook<
  [
    error: Error,
    vnode: InternalPreactVNode,
    oldVNode: InternalPreactVNode,
    errorInfo: Record<PropertyKey, unknown>
  ]
>;

export const PREACT_HOOK_NAMES = {
  _hook: "__h",
  _diff: "__b",
  _render: "__r",
  _catchError: "__e",
  _root: "__",
} as const;

export const HOOK = "_hook";
export const DIFF = "_diff";
export const RENDER = "_render";
export const CATCH_ERROR = "_catchError";
export const ROOT = "_root";

export type PREACT_HOOK_NAMES = typeof PREACT_HOOK_NAMES;

export interface InternalPreactElement extends HTMLElement {
  /** children */
  __k?: InternalPreactVNode | null;
  /** Event listeners to support event delegation */
  l?: Record<string, (e: Event) => void>;

  // Preact uses this attribute to detect SVG nodes
  ownerSVGElement?: SVGElement | null;

  // style: HTMLElement["style"]; // From HTMLElement

  data?: string | number; // From Text node
}

export interface InternalEffect {
  _sources: object | undefined;
  _start: () => () => void;
  _callback: () => void;
  _dispose: () => void;
}

export interface InternalSource {
  fileName: string;
  lineNumber: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyFn = (...args: any[]) => any;
