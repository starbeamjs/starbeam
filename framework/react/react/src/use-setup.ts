import { Formula, Reactive } from "@starbeam/core";
import { isObject } from "@starbeam/core-utils";
import { type DescriptionArgs, Stack } from "@starbeam/debug";
import {
  type CleanupTarget,
  type Unsubscribe,
  LIFETIME,
} from "@starbeam/timeline";
import { useLifecycle } from "@starbeam/use-strict-lifecycle";
import { useState } from "react";

export function useSetup<T>(
  callback: (setup: SetupBuilder) => (() => T) | Reactive<T>,
  description?: string | DescriptionArgs
): T {
  const desc = Stack.description(description);

  const [, setNotify] = useState({});

  const instance = useLifecycle((lifecycle) => {
    const builder = new SetupBuilder();
    const instance = callback(builder);

    lifecycle.on.cleanup(() => {
      if (isObject(instance)) {
        LIFETIME.finalize(instance);
      }
    });

    lifecycle.on.layout(() => {
      SetupBuilder.runLayouts(builder);
    });

    lifecycle.on.idle(() => {
      SetupBuilder.runEffects(builder);
    });

    let reactive: Reactive<T>;

    if (Reactive.is(instance)) {
      reactive = instance;
    } else {
      reactive = Formula(instance, desc);
    }

    // const renderer = TIMELINE.render(reactive, () => setNotify({}), desc);

    lifecycle.on.cleanup(() => {
      LIFETIME.finalize(renderer);
    });

    return reactive;
  });

  return instance.current;
}

class SetupBuilder implements CleanupTarget {
  static runLayouts(builder: SetupBuilder) {
    for (const layout of builder.#layouts) {
      const cleanup = layout();

      if (cleanup) {
        LIFETIME.on.cleanup(builder, cleanup);
      }
    }
  }

  static runEffects(builder: SetupBuilder) {
    for (const effect of builder.#effects) {
      const cleanup = effect();

      if (cleanup) {
        LIFETIME.on.cleanup(builder, cleanup);
      }
    }
  }

  #layouts: Set<() => void | (() => void)> = new Set();
  #effects: Set<() => void | (() => void)> = new Set();

  /**
   * This code is executed after the component is rendered, but before the DOM is painted. It runs
   * in `useLayoutEffect` timing (i.e. in a browser microtask).
   */
  layout(callback: () => void | (() => void)): Unsubscribe {
    this.#layouts.add(callback);

    return () => {
      this.#layouts.delete(callback);
    };
  }

  /**
   * https://beta.reactjs.org/learn/synchronizing-with-effects
   */
  effect(callback: () => void | (() => void)): Unsubscribe {
    this.#effects.add(callback);

    return () => {
      this.#effects.delete(callback);
    };
  }

  link(child: object): Unsubscribe {
    return LIFETIME.link(this, child);
  }

  on = {
    cleanup: (finalizer: () => void): Unsubscribe => {
      return LIFETIME.on.cleanup(this, finalizer);
    },
  };
}
