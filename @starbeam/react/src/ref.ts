// export type Modifier<
//   E extends browser.Element = browser.HTMLElement,
//   T = unknown
// > = (element: E, hook: SimpleHook<T>) => T;

import type { browser } from "@domtree/flavors";
import { ElementPlaceholder, type ElementType } from "@starbeam/core";
import {
  assert,
  type InferReturn,
  type VerifierFunction,
} from "@starbeam/fundamental";
import { expected, isPresent, verified, Verifier } from "@starbeam/verify";

// export function Modifier<M extends Modifier>(modifier: M): M {
//   return modifier;
// }

// export function reifyModifier<T, E extends browser.Element>(
//   modifier: Modifier<E, T>,
//   element: E,
//   description: string
// ): HookBlueprint<T> {
//   return Hook((hook: SimpleHook<T>) => modifier(element, hook), description);
// }

// class RefState<E extends browser.Element> extends Enum(
//   "PreRender(T)",
//   "Rendered(T)",
//   "Detached"
// )<ElementPlaceholder<E>> {
//   get placeholder(): ElementPlaceholder<E> {
//     return this.match({
//       PreRender: () => {
//         throw Error(
//           `Unexpectedly attempted to get element before the component was rendered`
//         );
//       },
//       Rendered: (element) => element,
//       Detached: () => {
//         throw Error(
//           `Unexpectedly attempted to get element after the ref was detached`
//         );
//       },
//     });
//   }

//   detached(): RefState<E> {
//     return this.match({
//       PreRender: () => {
//         throw Error(
//           `Unexpectedly attempted to detach element from ref before the ref was attached`
//         );
//       },
//       Rendered: () => RefState.Detached(),
//       Detached: () => {
//         throw Error(
//           `Unexpectedly attempted to detach an element from ref twice`
//         );
//       },
//     });
//   }
// }

const REFS = new WeakMap<object, ElementPlaceholder<browser.Element>>();

export function getPlaceholder<E extends browser.Element>(
  ref: ElementRef<E>
): ElementPlaceholder<E> {
  return verified(
    REFS.get(ref),
    isPresent,
    expected(`a Starbeam ref's element`)
      .toBe(`present`)
      .when(`accessed from the internals of a Starbeam hook`)
  ) as unknown as ElementPlaceholder<E>;
}

const REF = Symbol("REF");
type REF = typeof REF;

interface InternalElementRef<E extends browser.Element = browser.Element> {
  (element: browser.Element): void;
  [REF]: true;
}

export interface ReactElementRef<E extends browser.Element = browser.Element> {
  (element: E): void;
  readonly [REF]: E;
}

export interface ElementRef<E extends browser.Element = browser.Element> {
  readonly [REF]: E;
}

// export type ElementType<E extends browser.Element> = abstract new (
//   ...args: any[]
// ) => E;

export type ElementVerifier<E extends browser.Element> = VerifierFunction<
  browser.Element,
  E
>;

function ClassVerifier<E extends browser.Element>(
  Class: abstract new (...args: any[]) => E
): ElementVerifier<E> {
  function verify(element: browser.Element): element is E {
    return element instanceof Class;
  }

  Verifier.implement(
    verify,
    expected(`element provided by React`)
      .toBe(Class.name)
      .when(`receiving an element from React's ref={} attribute`)
      .butGot((element) => element.constructor.name)
  );

  return verify;
}

export function ref<E extends browser.Element>(
  kind: ElementType<E>
): ReactElementRef<E> {
  const placeholder = ElementPlaceholder<E>(kind);
  const verifier = ClassVerifier(kind);

  const refCallback = ((element: E | null) => {
    if (element !== null) {
      const el = verified(element, verifier);

      if (placeholder.current === null) {
        placeholder.initialize(el);
      } else {
        assert(
          placeholder.current === el,
          `You cannot initialize a ref with different elements.`
        );
      }
    }
  }) as InternalElementRef<E>;

  refCallback[REF] = true;

  REFS.set(
    refCallback,
    placeholder as unknown as ElementPlaceholder<browser.Element>
  );

  return refCallback as InferReturn;
}

// const LAYOUT_VALUES = new WeakMap<
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   Layout<any>,
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   { readonly promise: Promise<unknown>; fulfill: (value: any) => void }
// >();

// export class Layout<T> extends Enum("Rendering", "Rendered(T)")<T> {
//   map<U>(callback: (value: T) => U): Layout<U> {
//     return this.match({
//       Rendering: () => Layout.Rendering(),
//       Rendered: (value) => Layout.Rendered(callback(value)),
//     });
//   }

//   get(): T | null {
//     return this.match({
//       Rendering: () => null,
//       Rendered: (value) => value,
//     });
//   }

//   get rendered(): T {
//     const values = LAYOUT_VALUES.get(this);
//     let promise: Promise<T>;

//     if (values) {
//       promise = values.promise as Promise<T>;
//     } else {
//       let fulfill!: (value: T) => void;
//       promise = new Promise((f) => {
//         fulfill = f;
//       });

//       LAYOUT_VALUES.set(this, { promise, fulfill });
//     }

//     throw promise;
//   }
// }

export {};
