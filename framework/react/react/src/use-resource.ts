import type { ResourceConstructor } from "@starbeam/core";
import { ReactiveResource } from "@starbeam/core/src/reactive-core/formula/resource.js";
import {
  type CleanupTarget,
  type OnCleanup,
  type Reactive,
  type Unsubscribe,
  LIFETIME,
} from "@starbeam/timeline";

import { useSetup } from "./use-setup.js";
import { useDeps } from "./utils.js";

export function useResource<T>(
  resource: () => ResourceConstructor<T>,
  deps: unknown[]
): T {
  const reactiveDeps = deps.length === 0 ? null : useDeps(deps);
  return useSetup((setup) => {
    const r = setup.use(
      resource(),
      reactiveDeps ? () => reactiveDeps.consume() : undefined
    );

    setup.on.layout(() => {
      ReactiveResource.setup(r);
    });

    return r;
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface ReactiveBlueprint<T> {
  (builder: ReactiveBuilder): Reactive<T> | (() => T);
}

class ReactiveBuilder implements CleanupTarget {
  link(child: object): Unsubscribe {
    return LIFETIME.link(this, child);
  }
  on: OnCleanup = {
    cleanup: (finalizer: () => void): Unsubscribe => {
      return LIFETIME.on.cleanup(this, finalizer);
    },
  };
}
