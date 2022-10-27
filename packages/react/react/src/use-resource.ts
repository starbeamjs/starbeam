import { callerStack } from "@starbeam/debug";
import { LIFETIME, TIMELINE } from "@starbeam/timeline";
import {
  type IntoResource,
  type Reactive,
  type ResourceBlueprint,
  Factory,
  FormulaFn,
  Marker,
} from "@starbeam/universal";
import {
  unsafeTrackedElsewhere,
  useLifecycle,
} from "@starbeam/use-strict-lifecycle";

import { useNotify } from "./use-reactive.js";
import { useComponent } from "./use-setup.js";

export type UseFactory<T> = ResourceBlueprint<T> | (() => IntoResource<T>);

export function use<T>(factory: ResourceBlueprint<T>): T | undefined;
export function use<T>(
  factory: UseFactory<T>,
  dependencies: unknown[]
): T | undefined;
export function use<T>(
  factory: UseFactory<T>,
  options: { initial: T },
  dependencies: unknown[]
): T;
export function use<T>(
  factory: UseFactory<T>,
  options?: { initial: T } | unknown[],
  dependencies?: unknown[]
): T {
  const owner = useComponent();
  const notify = useNotify();

  const deps = Array.isArray(options) ? options : dependencies ?? [];
  const initialValue = Array.isArray(options) ? undefined : options?.initial;
  let prev: unknown[] = deps;

  const result = useLifecycle(deps, ({ on }) => {
    let lastResource: Reactive<T | undefined> | undefined = undefined;
    const marker = Marker();

    function create(): void {
      if (lastResource) LIFETIME.finalize(lastResource);

      const created =
        typeof factory === "function"
          ? Factory.resource(factory(), owner)
          : factory.create(owner);

      lastResource = created;
      marker.update(callerStack());

      on.cleanup(() => {
        LIFETIME.finalize(created);
      });
    }

    on.layout(create);

    on.update((next = []) => {
      if (!sameDeps(prev, next)) {
        prev = next;
        if (lastResource) LIFETIME.finalize(lastResource);
        create();
      }
    });

    const value = FormulaFn(() => {
      marker.consume();
      return lastResource?.current ?? initialValue;
    });

    on.cleanup(TIMELINE.on.change(value, notify));

    return value;
  });

  return unsafeTrackedElsewhere(() => result.current) as T;
}

// const useResourceConstructor = <T>(
//   resource: UseResourceConstructor<T>,
//   deps: Deps | undefined
// ): ResourceBlueprint<T> => {
//   if (typeof resource === "function") {
//     return Resource(({ use, describe }) => {
//       deps?.consume();
//       const instance = resource();
//       describe(instance.description);
//       return use(instance);
//     });
//   } else if (deps) {
//     return Resource(({ use, describe }) => {
//       deps?.consume();
//       describe(resource.description);
//       return use(resource);
//     });
//   } else {
//     return resource;
//   }
// };

// export function useReactiveResource<T>(
//   resource: UseResourceConstructor<T>,
//   dependencies?: unknown[]
// ): Reactive<T> | undefined {
//   const notify = useNotify();

//   const nextBlueprint: Reactive<ResourceBlueprint<T>> =
//     typeof resource === "function" ? FormulaFn(resource) : Static(resource);

//   return useLifecycle({ deps: dependencies }, (lifecycle) => {
//     const owner = {};
//     let next: { resource: Reactive<T>; cleanup: Unsubscribe } | undefined;
//     let currentBlueprint = nextBlueprint.current;

//     console.log("render");

//     lifecycle.on.cleanup(() => {
//       LIFETIME.finalize(owner);
//     });

//     lifecycle.on.update(({ deps }) => {
//       const blueprint = nextBlueprint.current;
//       if (sameDeps(deps, dependencies) && currentBlueprint === blueprint) {
//         console.log("same");
//         return;
//       } else if (next) {
//         next.cleanup();
//         LIFETIME.finalize(next.resource);
//       }

//       currentBlueprint = blueprint;
//       currentResource = blueprint.create(owner);
//       Resource.setup(currentResource);
//     });

//     lifecycle.on.layout(() => {
//       const resource = nextBlueprint.current.create(owner);
//       const cleanup = TIMELINE.on.change(resource, notify);
//       lifecycle.on.cleanup(cleanup);
//       next = { resource, cleanup };
//       Resource.setup(resource);
//       ReactiveProtocol.log(resource);
//     });

//     return currentResource;
//   });
// }

// export function useResource<T, U>(
//   resource: UseResourceConstructor<T>,
//   options: { initial: U },
//   deps?: unknown[]
// ): T | U {
//   const instance = useReactiveResource(resource, deps);
//   return unsafeTrackedElsewhere(() => instance?.current);
// }

function sameDeps(
  prev: unknown[] | undefined,
  next: unknown[] | undefined
): boolean {
  if (prev === undefined || next === undefined) {
    return prev === next;
  }

  return (
    prev.length === next.length &&
    prev.every((value, index) => Object.is(value, next[index]))
  );
}
