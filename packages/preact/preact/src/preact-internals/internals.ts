import type { ComponentChild, Options } from "preact";

import type {
  MangledHookNames,
  PrivateHookNames,
  RawPreactOptions,
} from "./interfaces.js";
import type { InternalPreactVNode } from "./internals/vnode.js";

export interface HookName {
  dev: string;
  prod: string;
}

export type PreactOptionName = keyof Options | PrivateHookNames;
export type MangledPreactOptionName = keyof Options | MangledHookNames;

type Req<T> = {
  [P in keyof T]-?: T[P] extends infer U | undefined ? U : T[P];
};

export type PreactHook<T extends PreactOptionName> = Req<RawPreactOptions>[T];

type Primitive = string | number | bigint | boolean | null | undefined;

export function isProbablyVNode(
  child: ComponentChild,
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
