import type { browser, minimal } from "@domtree/flavors";
import { JSDOM } from "jsdom";
import { useLayoutEffect } from "react";
import {
  assert,
  Enum,
  HookBlueprint,
  HookValue,
  is,
  Reactive,
  RenderedRoot,
  Universe,
  verified,
} from "starbeam";
import { useSyncExternalStore } from "use-sync-external-store";

const REFS = new WeakMap<Ref<browser.Element>, browser.Element>();

const REF = Symbol("REF");
type REF = typeof REF;

interface Ref<E extends browser.Element> {
  (element: E): void;
  readonly [REF]: true;
}

export function ref<E extends browser.Element>(
  kind: abstract new (...args: any[]) => E
): Ref<E> {
  return function setElement(element: browser.Element): void {
    assert(
      element instanceof kind,
      `Expected ref's element to be a ${kind.name}, but got a ${element.constructor.name}`
    );

    REFS.set(setElement as Ref<browser.Element>, element);
  } as unknown as Ref<E>;
}

const universe = Universe.jsdom(new JSDOM());

const LAYOUT_VALUES = new WeakMap<
  Layout<any>,
  { promise: Promise<unknown>; fulfill: (value: any) => void }
>();

class Layout<T> extends Enum("Rendering", "Rendered(T)")<T> {
  map<U>(callback: (value: T) => U): Layout<U> {
    return this.match({
      Rendering: () => Layout.Rendering(),
      Rendered: (value) => Layout.Rendered(callback(value)),
    });
  }

  get rendered(): T {
    let values = LAYOUT_VALUES.get(this);
    let promise: Promise<T>;

    if (values) {
      promise = values.promise as Promise<T>;
    } else {
      let fulfill!: (value: T) => void;
      promise = new Promise((f) => {
        fulfill = f;
      });

      LAYOUT_VALUES.set(this, { promise, fulfill });
    }

    throw promise;
  }
}

export function useModifier<T, E extends browser.Element>(
  ref: Ref<E>,
  hook: (element: E) => HookBlueprint<T>
): Layout<T> {
  let layout: Layout<T> = Layout.Rendering();
  let value: HookValue<T> = HookValue.create();
  let root: RenderedRoot<HookValue<T>>;

  useLayoutEffect(() => {
    const element = verified(
      REFS.get(ref as Ref<browser.Element>),
      is.Present
    ) as E;

    let initializedRoot = (root = universe.use(hook(element), { into: value }));
    layout = Layout.Rendered(value.current);

    return () => universe.finalize(initializedRoot);
  }, []);

  return useSyncExternalStore(
    (notifyReact) => {
      // TODO: value.current might be undefined here; try to clean up the types for this use-case
      let last = value.current;

      let teardown = universe.on.advance(() => {
        if (!root) {
          return;
        }

        root.poll();
        let current = value.current;

        if (last !== current) {
          last = current;
          layout = Layout.Rendered(current);
          notifyReact();
        }
      });

      return teardown;
    },
    () => layout
  );
}

export function useHook<T>(hook: HookBlueprint<T>): T {
  const value: HookValue<T> = HookValue.create();
  const root = universe.use(hook, { into: value });

  return externalStore(value, root);
}

function externalStore<T>(value: HookValue<T>, root: RenderedRoot<unknown>): T {
  let last = value.current;

  return useSyncExternalStore(
    (notifyReact) => {
      let teardown = universe.on.advance(() => {
        root.poll();
        let current = value.current;

        if (last !== current) {
          last = current;
          notifyReact();
        }
      });

      return teardown;
    },
    () => last
  );
}
