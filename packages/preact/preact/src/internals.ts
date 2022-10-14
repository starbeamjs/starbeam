/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Component, ComponentChild, Options, VNode } from "preact";

export interface HookName {
  dev: string;
  prod: string;
}

function HookName(dev: string, prod: string = dev): HookName {
  return { dev, prod };
}

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

type Hook<Args extends any[] = [vnode: InternalVNode]> = (
  ...args: Args
) => void;

interface RawPreactOptions
  extends Partial<Record<keyof PREACT_HOOK_NAMES, AnyFn>>,
    Options {
  _hook?: Hook<[component: Component, index: number, type: number]>;
  _catchError?: Hook<
    [
      error: Error,
      vnode: InternalVNode,
      oldVNode: InternalVNode,
      errorInfo: Record<PropertyKey, unknown>
    ]
  >;
  _root?: Hook<[vnode: InternalVNode, parent: ParentNode]>;
  _diff?: Hook;
  _render?: Hook;
}

export type FilterFn<K extends keyof RawPreactOptions> =
  RawPreactOptions[K] extends AnyFn | void ? K : never;

export type PreactOptionName = keyof RawPreactOptions;

export interface Effect {
  _sources: object | undefined;
  _start(): () => void;
  _callback(): void;
  _dispose(): void;
}

export interface InternalPreactElement extends HTMLElement {
  /** children */
  __k?: InternalVNode | null;
  /** Event listeners to support event delegation */
  l?: Record<string, (e: Event) => void>;

  // Preact uses this attribute to detect SVG nodes
  ownerSVGElement?: SVGElement | null;

  // style: HTMLElement["style"]; // From HTMLElement

  data?: string | number; // From Text node
}

export interface InternalComponent extends Component<any, any> {
  /** the vnode */
  __v: InternalVNode;
  /** the parent DOM */
  __P: InternalPreactElement;
  _updater?: Effect;
  _updateFlags: number;
  _childDidSuspend?: boolean;
}

export function getVNode(component: InternalComponent): InternalVNode {
  return component.__v;
}

export function getParentDOM(
  component: InternalComponent
): InternalPreactElement {
  return component.__P;
}

export interface InternalSource {
  fileName: string;
  lineNumber: number;
}

export interface InternalVNode<P = any> extends preact.VNode<P> {
  __source?: InternalSource | null;
  __self?: unknown;

  /** The parent DOM */
  __P?: InternalPreactElement | null;
  /** The component's owner */
  __o: InternalVNode | null;
  /** The component's children */
  __k: InternalVNode[] | null;
  /** The component instance for this VNode */
  __c: InternalComponent;
  /** The parent VNode */
  __?: InternalVNode;
  /** The DOM node for this VNode */
  __e?: Element | Text;
  /** The depth of the vnode */
  __b?: number | null;
  /** Props that had Signal values before diffing (used after diffing to subscribe) */
  __np?: Record<string, any> | null;
}

type Primitive = string | number | bigint | boolean | null | undefined;

export function isProbablyVNode(child: ComponentChild): child is InternalVNode {
  const candidate = child as
    | InternalVNode
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

export function getDOM(vnode: InternalVNode): Element | Text | undefined {
  return vnode.__e;
}

export function getOwner(vnode: InternalVNode): InternalVNode | null {
  return vnode.__o;
}

export function getSelf(vnode: InternalVNode): unknown {
  return vnode.__self;
}

export function setOwner(
  vnode: InternalVNode,
  owner: InternalVNode | null
): void {
  vnode.__o = owner;
}

export function getComponent(vnode: InternalVNode): InternalComponent {
  return vnode.__c;
}

export function getParent(vnode: InternalVNode): InternalVNode | undefined {
  return vnode.__;
}

export function deleteParent(vnode: InternalVNode): void {
  delete vnode.__;
}

export function getChildren(vnode: InternalVNode): InternalVNode[] | null {
  return vnode.__k;
}

export function updateChildren(
  vnode: InternalVNode,
  updater: (prev: InternalVNode[]) => (InternalVNode | VNode)[] | null
): void {
  console.log({ vnode });
  if (!vnode.__k) {
    return;
  }
  vnode.__k = updater(vnode.__k) as InternalVNode[] | null;
}

export function deleteDepth(vnode: InternalVNode): void {
  delete vnode.__b;
}

export function setSource(
  vnode: InternalVNode | null | undefined,
  source: InternalSource | null | undefined
): InternalVNode | null | undefined {
  if (vnode) {
    vnode.__source = source;
  }
  return vnode;
}

export function setSelf(
  vnode: InternalVNode | null | undefined,
  self: unknown
): InternalVNode | null | undefined {
  if (vnode) {
    vnode.__self = self;
  }
  return vnode;
}

export type OriginalHookFn<T extends PreactOptionName> = RawPreactOptions[T];

export type HookParameters<T> = T extends (...args: infer P) => any
  ? {
      [K in keyof P]: P[K] extends VNode<infer P> ? InternalVNode<P> : P[K];
    }
  : never;

export type HookFn<T extends keyof RawPreactOptions> =
  RawPreactOptions[T] extends infer Fn
    ? Fn extends AnyFn
      ? (...args: HookParameters<Fn>) => void | boolean
      : never
    : never;

type AnyFn = (...args: any[]) => any;

export class Augment {
  readonly #original: RawPreactOptions;

  constructor(original: RawPreactOptions) {
    this.#original = original;
  }

  original<T extends PreactOptionName>(key: T): OriginalHookFn<T> {
    return this.#original[key];
  }

  #getOriginal<T extends PreactOptionName>(
    name: T
  ): [fn: AnyFn | undefined, name: string] {
    const dev = this.#original[name];

    if (dev) {
      return [dev, name];
    } else {
      const prod = (PREACT_HOOK_NAMES as any)[name];

      if (prod) {
        return [(this.#original as any)[prod], prod];
      } else {
        if (!(name in PREACT_HOOK_NAMES) && name[0] === "_") {
          throw new Error(`Unknown hook name: ${name}`);
        } else {
          return [undefined, name];
        }
      }
    }
  }

  hook<T extends PreactOptionName & keyof RawPreactOptions>(
    devName: T,
    hook: HookFn<T>
  ): void {
    const [original, name] = this.#getOriginal(devName);

    (this.#original as any)[name] = ((...args) => {
      const result = (hook as AnyFn)(...(args as Parameters<HookFn<T>>));

      if (result === undefined || result === true) {
        original?.(...args);
      }
    }) as AnyFn;
  }
}
