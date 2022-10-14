/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ComponentChild } from "preact";
import type { AnyFn, RawPreactOptions } from "./interfaces.js";
import type { InternalPreactVNode } from "./internals/vnode.js";

export interface HookName {
  dev: string;
  prod: string;
}

export type FilterFn<K extends keyof RawPreactOptions> =
  RawPreactOptions[K] extends AnyFn | void ? K : never;

export type PreactOptionName = keyof RawPreactOptions;

export type PreactHook<T extends keyof RawPreactOptions> = RawPreactOptions[T];

type Primitive = string | number | bigint | boolean | null | undefined;

export function isProbablyVNode(
  child: ComponentChild
): child is InternalPreactVNode {
  const candidate = child as
    | InternalPreactVNode
    | Record<PropertyKey, unknown>
    | Primitive;

  return (
    candidate != null &&
    typeof candidate === "object" &&
    candidate["__"] !== undefined &&
    candidate["__k"] !== undefined &&
    candidate["__c"] !== undefined
  );
}
