/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ComponentChild, Options } from "preact";

import type {
  AnyFn,
  MangledHookNames,
  PrivateHookNames,
  RawPreactOptions,
} from "./interfaces.js";
import type { InternalPreactVNode } from "./internals/vnode.js";

export interface HookName {
  dev: string;
  prod: string;
}

export type FilterFn<K extends keyof RawPreactOptions> =
  RawPreactOptions[K] extends AnyFn | void ? K : never;

export type PreactOptionName = keyof Options | PrivateHookNames;
export type MangledPreactOptionName = keyof Options | MangledHookNames;

type Req<T> = {
  [P in keyof T]-?: T[P] extends infer T | undefined ? T : T[P];
};

export type PreactHook<T extends PreactOptionName> = Req<RawPreactOptions>[T];

type Primitive = string | number | bigint | boolean | null | undefined;

export function isProbablyVNode(
  child: ComponentChild
): child is InternalPreactVNode {
  const candidate = child as
    | InternalPreactVNode
    | Record<PropertyKey, unknown>
    | Primitive;

  if (candidate && typeof candidate === "object") {
    const type = typeof candidate.type;
    return (
      (type === "string" || type === "function") &&
      candidate.__k !== undefined &&
      candidate.__c !== undefined
    );
  } else {
    return false;
  }
}
