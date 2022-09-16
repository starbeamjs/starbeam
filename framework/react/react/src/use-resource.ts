import {
  type ResourceBlueprint,
  Cell,
  PolledFormulaFn,
  Resource,
  TIMELINE,
} from "@starbeam/core";
import type { Description } from "@starbeam/debug";
import { descriptionFrom } from "@starbeam/debug";
import { LIFETIME } from "@starbeam/timeline";
import {
  unsafeTrackedElsewhere,
  useLifecycle,
} from "@starbeam/use-strict-lifecycle";
import { useState } from "react";

function createReactiveResource<T>(
  resource: () => ResourceBlueprint<T>,
  deps: unknown[] | undefined,
  description: string | Description | undefined
): Resource<T> {
  const desc = descriptionFrom({
    type: "resource",
    api: "useReactiveSetup",
    fromUser: description,
  });

  const [, setNotify] = useState({});

  const instance = useLifecycle({ resource, deps }, (lifecycle) => {
    let lastDeps = deps;
    let setup = false;

    const owner = {};

    let currentResource = resource().create({
      owner,
    });

    const resourceCell = Cell(currentResource);

    const value = PolledFormulaFn(() => {
      return resourceCell.current.current;
    }, desc);

    lifecycle.on.cleanup(() => {
      LIFETIME.finalize(owner);
    });

    lifecycle.on.update(({ deps: nextDeps, resource: nextResource }) => {
      if (!sameDeps(lastDeps, nextDeps)) {
        lastDeps = nextDeps;
        LIFETIME.finalize(currentResource);
        currentResource = nextResource().create({ owner });
        resourceCell.set(currentResource);

        if (setup) {
          Resource.setup(currentResource);
        }
      }
    });

    lifecycle.on.layout(() => {
      setup = true;
      Resource.setup(resourceCell.current);

      const renderer = TIMELINE.on.change(value, () => {
        setNotify({});
      });

      lifecycle.on.cleanup(() => {
        LIFETIME.finalize(renderer);
      });
    });

    return value;
  });

  return instance;
}

function createResource<T>(
  resource: () => ResourceBlueprint<T>,
  deps: unknown[] | undefined,
  description: string | Description | undefined
): T {
  const instance = useReactiveResource(resource, deps, description);

  return unsafeTrackedElsewhere(() => instance.current);
}

export function useResource<T>(
  resource: () => ResourceBlueprint<T>,
  deps?: unknown[] | string | Description,
  description?: string | Description
): T {
  if (Array.isArray(deps)) {
    return createResource(resource, deps, description);
  } else {
    return createResource(resource, undefined, deps);
  }
}

export function useReactiveResource<T>(
  resource: () => ResourceBlueprint<T>,
  deps?: unknown[] | string | Description,
  description?: string | Description
): Resource<T> {
  if (Array.isArray(deps)) {
    return createReactiveResource(resource, deps, description);
  } else {
    return createReactiveResource(resource, undefined, deps);
  }
}

export function sameDeps(
  deps: unknown[] | undefined,
  nextDeps: unknown[] | undefined
): boolean {
  // make sure the items are equal according to Object.is

  if (Array.isArray(deps) && Array.isArray(nextDeps)) {
    if (deps.length !== nextDeps.length) {
      return false;
    }

    for (let i = 0; i < deps.length; i++) {
      if (deps[i] !== nextDeps[i]) {
        return false;
      }
    }

    return true;
  } else {
    return deps === nextDeps;
  }
}
