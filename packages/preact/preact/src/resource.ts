import type { ReadValue } from "@starbeam/reactive";
import { DEBUG } from "@starbeam/reactive";
import type { Lifecycle, UseReactive } from "@starbeam/renderer";
import {
  intoResourceBlueprint,
  managerCreateLifecycle,
  managerSetupReactive,
  managerSetupResource,
  managerSetupService,
} from "@starbeam/renderer";
import type { IntoResourceBlueprint, Sync, SyncFn } from "@starbeam/resource";
import { Resource } from "@starbeam/resource";
import { pushingScope, RUNTIME } from "@starbeam/runtime";
import { finalize } from "@starbeam/shared";
import type { Reactive } from "@starbeam/universal";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";

import { MANAGER } from "./renderer.js";

type Bridge = readonly [unknown, ...unknown[]];

export type ElementResource<T, E extends Element> =
  | {
      readonly status: "pending";
      readonly ref: (element: E | null) => void;
    }
  | {
      readonly status: "attached";
      readonly ref: (element: E | null) => void;
      readonly current: T;
    };

export type ElementResourceBlueprint<E extends Element, T> = (
  element: E,
) => IntoResourceBlueprint<T>;

export function setupReactive<T>(
  blueprint: UseReactive<T>,
): Reactive<ReadValue<T>> {
  DEBUG?.markEntryPoint(["function:call", "setupReactive"]);
  return managerSetupReactive(MANAGER, blueprint);
}

export function useReactive<T>(
  blueprint: UseReactive<T>,

  /**
   * Preact currently doesn't support deps, but when we support deps, you will
   * need to pass `[]` when there are no dependencies.
   */
  _deps: [],
): ReadValue<T> {
  DEBUG?.markEntryPoint(["function:call", "useReactive"]);
  return setupReactive(blueprint).read();
}

export function setupResource<T>(blueprint: IntoResourceBlueprint<T>): T {
  DEBUG?.markEntryPoint(["function:call", "setupResource"]);
  return managerSetupResource(MANAGER, blueprint);
}

export function setupSync(blueprint: Sync<void>): void {
  DEBUG?.markEntryPoint(["function:call", "setupSync"]);
  managerSetupResource(MANAGER, blueprint);
}

export function useResource<T>(
  blueprint: IntoResourceBlueprint<T>,
  deps?: readonly unknown[],
): T {
  DEBUG?.markEntryPoint(["function:call", "useResource"]);
  return useResourceInstance(blueprint, deps ?? []);
}

export function useElementResource<E extends Element, T>(
  blueprint: ElementResourceBlueprint<E, T>,
  bridge?: Bridge,
): ElementResource<T, E> {
  const [element, setElement] = useState<E | null>(null);
  const [currentBlueprint] = useLatestRef(blueprint);

  const ref = useCallback((element: E | null) => {
    setElement(element);
  }, []);

  const attachment = useResource(
    () =>
      Resource(({ use }) => {
        if (element === null) {
          return { status: "pending" as const, ref };
        }

        return {
          status: "attached" as const,
          ref,
          current: use(
            intoResourceBlueprint(currentBlueprint.current(element)),
          ),
        };
      }),
    bridge ? [element, ...bridge] : [element],
  );

  return attachment;
}

interface ScheduledHandler {
  readonly register: (handler: () => void) => void;
  readonly schedule: () => void;
}

interface ResourceInstance<T> {
  readonly deps: readonly unknown[];
  readonly scope: object;
  readonly sync: SyncFn<void>;
  readonly value: T;
  unsubscribe: (() => void) | undefined;
  finalized: boolean;
}

function useResourceInstance<T>(
  blueprint: IntoResourceBlueprint<T>,
  deps: readonly unknown[],
): T {
  const [currentBlueprint] = useLatestRef(blueprint);
  const instance = useRef<ResourceInstance<T> | null>(null);
  const handler = useScheduledHandler();

  if (instance.current === null || !sameDeps(deps, instance.current.deps)) {
    instance.current = createResourceInstance(currentBlueprint.current, deps);
  }

  const current = instance.current;

  useLayoutEffect(() => {
    handler.register(current.sync);
    current.unsubscribe = RUNTIME.subscribe(current.sync, handler.schedule);

    return () => {
      cleanupResourceInstance(current);
    };
  }, [current]);

  return current.value;
}

function createResourceInstance<T>(
  blueprint: IntoResourceBlueprint<T>,
  deps: readonly unknown[],
): ResourceInstance<T> {
  const [scope, { sync, value }] = pushingScope(() =>
    typeof blueprint === "function" ? blueprint().setup() : blueprint.setup(),
  );

  return {
    deps,
    scope,
    sync,
    value,
    unsubscribe: undefined,
    finalized: false,
  };
}

function cleanupResourceInstance<T>(
  instance: ResourceInstance<T> | null,
): void {
  if (instance === null || instance.finalized) return;

  instance.unsubscribe?.();
  instance.unsubscribe = undefined;
  finalize(instance.scope);
  instance.finalized = true;
}

function useScheduledHandler(): ScheduledHandler {
  const [, setScheduleDep] = useState({});
  const handlerRef = useRef(null as null | (() => void));
  const needsSyncRef = useRef(false);

  useEffect(() => {
    const handler = handlerRef.current;

    if (handler && needsSyncRef.current) {
      needsSyncRef.current = false;
      handler();
    }
  });

  return {
    register: (handler) => {
      handlerRef.current = handler;
      needsSyncRef.current = true;
    },
    schedule: () => {
      needsSyncRef.current = true;
      setScheduleDep({});
    },
  };
}

function useLatestRef<T>(value: T): readonly [{ readonly current: T }] {
  const ref = useRef(value);
  ref.current = value;
  return [ref];
}

function sameDeps(next: readonly unknown[], prev: readonly unknown[]): boolean {
  if (next.length !== prev.length) return false;
  return next.every((value, index) => Object.is(value, prev[index]));
}

export function setupService<T>(blueprint: IntoResourceBlueprint<T>): T {
  DEBUG?.markEntryPoint(["function:call", "setupResource"]);
  return managerSetupService(MANAGER, blueprint);
}

export function useService<T>(blueprint: IntoResourceBlueprint<T>): T {
  DEBUG?.markEntryPoint(["function:call", "useResource"]);
  return setupService(blueprint);
}

export function setup<T>(blueprint: (lifecycle: Lifecycle) => T): T {
  DEBUG?.markEntryPoint(["function:call", "setup"]);
  const lifecycle = managerCreateLifecycle(MANAGER);
  return useMemo(() => blueprint(lifecycle), []);
}
