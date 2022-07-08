import {
  Resource,
  type CreateResource,
  type ResourceConstructor,
} from "@starbeam/core";
import { callerStack } from "@starbeam/debug";
import {
  type CleanupTarget,
  type OnCleanup,
  type Reactive,
  type Unsubscribe,
  LIFETIME,
} from "@starbeam/timeline";

import { useSetup } from "./use-setup.js";

export function useResource<T>(resource: () => CreateResource<T>): T {
  const caller = callerStack();

  return useSetup<T>((setup) => {
    const instance = setup.use(resource());

    setup.on.layout(() => {
      Resource.setup(instance, caller);
    });

    return instance;
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
