import type { HasTag, Reactive } from "@starbeam/interfaces";
import type { TrackingFrame } from "@starbeam/reactive";
import { finishFrame, startFrame } from "@starbeam/reactive";
import { RUNTIME } from "@starbeam/runtime";
import { finalize, onFinalize } from "@starbeam/shared";
import { isPresent, verified } from "@starbeam/verify";
import type { ComponentInternalInstance, Ref } from "vue";
import {
  getCurrentInstance,
  onBeforeMount,
  onBeforeUpdate,
  onMounted,
  onUnmounted,
  onUpdated,
  shallowRef,
} from "vue";

import type { StarbeamApp } from "./app.js";
import { useApp } from "./app.js";
import { CopyRefs, Lifecycle } from "./bookkeeping.js";

const INSTANCES = new WeakMap<ComponentInternalInstance, VueComponent>();

/**
 * A `VueComponent` uniquely represents a Vue component (specifically a Vue
 * {@linkcode ComponentInternalInstance}).
 *
 * For a given Vue component instance, there will only be one `VueComponent`.
 */
export class VueComponent {
  /**
   * Returns the current {@linkcode VueComponent}.
   *
   * This method should only be called within the scope of a `VueComponent`'s
   * `setup` function. If you need to use a `VueComponent` outside of its
   * `setup` function, save it off.
   */
  static current(): VueComponent {
    return VueComponent.#for(verified(getCurrentInstance(), isPresent));
  }

  static #for(instance: ComponentInternalInstance): VueComponent {
    let vueInstance = INSTANCES.get(instance);

    if (!vueInstance) {
      const newInstance = (vueInstance = new VueComponent(
        instance,
        new Lifecycle(),
      ));
      INSTANCES.set(instance, vueInstance);
      VueComponent.#setup(newInstance);
    }

    return vueInstance;
  }

  static #setup(instance: VueComponent): void {
    // when the Vue component is unmounted, finalize the instance, which will
    // propagate the finalization to any Starbeam resources scoped to the
    // `VueComponent`
    onUnmounted(() => void finalize(instance));

    // Before mounting, set up the tracking frame
    onBeforeMount(() => startFrame());

    let currentFrame: TrackingFrame | undefined;

    // Once the component is mounted, consume any rendered tags that were
    // accumulated during render.
    onMounted(() => {
      // Finish initializing the frame.
      currentFrame = finishFrame();

      currentFrame.subscribe(
        () => void instance.#publicInstance.$forceUpdate(),
      );

      // Run any accumulated after mount tasks
      instance.#lifecycle.run("mounted");
    });

    // When the component is going to *rerender*, we want to update the tracking
    // frame to reflect the new dependencies.
    onBeforeUpdate(() => {
      instance.#copyRefs.copy();
      verified(currentFrame, isPresent).update();
    });

    onUpdated(() => {
      finishFrame();
    });
  }

  readonly #instance: ComponentInternalInstance;
  /**
   * Tasks to run after the component is mounted.
   */
  readonly #lifecycle: Lifecycle;
  /**
   * Run these tasks before each rerender.
   */
  readonly #copyRefs = new CopyRefs();

  constructor(instance: ComponentInternalInstance, lifecycle: Lifecycle) {
    this.#instance = instance;
    this.#lifecycle = lifecycle;
  }

  get on(): Lifecycle {
    return this.#lifecycle;
  }

  get app(): StarbeamApp {
    return useApp(this.#instance.appContext.app);
  }

  get #publicInstance() {
    return verified(this.#instance.proxy, isPresent);
  }

  notify(): void {
    this.#publicInstance.$forceUpdate();
  }

  copiedRef<T>(reactive: Reactive<T>): Ref<T> {
    const ref = shallowRef(reactive.current);

    this.#render(reactive, () => {
      this.notify();
      this.#copyRefs.add(ref, reactive);
    });

    return ref;
  }

  #render(tagged: HasTag, callback: () => void): void {
    const unsubscribe = RUNTIME.subscribe(tagged, callback);
    if (unsubscribe) onFinalize(this, unsubscribe);
  }
}
