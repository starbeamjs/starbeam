import type { FormulaTag, HasTag, Reactive, Tag } from "@starbeam/interfaces";
import {
  DEBUG,
  type FinalizedFormula,
  FormulaLifecycle,
  type InitializingFormula,
} from "@starbeam/reactive";
import { RUNTIME } from "@starbeam/runtime";
import { getTag, initializeFormulaTag } from "@starbeam/tags";
import { isPresent, verified } from "@starbeam/verify";
import {
  type ComponentInternalInstance,
  getCurrentInstance,
  onBeforeMount,
  onBeforeUpdate,
  onMounted,
  onUnmounted,
  onUpdated,
} from "vue";

import { type StarbeamApp, useApp } from "./app.js";

const INSTANCES = new WeakMap<ComponentInternalInstance, VueInstance>();

export class VueInstance {
  static current(): VueInstance {
    return VueInstance.for(verified(getCurrentInstance(), isPresent));
  }

  static for(instance: ComponentInternalInstance): VueInstance {
    let vueInstance = INSTANCES.get(instance);

    if (!vueInstance) {
      const tags = new Set<FormulaTag>();
      const newInstance = (vueInstance = new VueInstance(instance, tags));
      INSTANCES.set(instance, vueInstance);
      VueInstance.#setup(newInstance);
    }

    return vueInstance;
  }

  static #setup(instance: VueInstance): void {
    let tag: FormulaTag | undefined;

    onUnmounted(() => void RUNTIME.finalize(instance));
    let initializing: InitializingFormula | undefined;
    onBeforeMount(() => {
      initializing = FormulaLifecycle();
    });

    let finalized: FinalizedFormula | undefined;

    onMounted(() => {
      for (const tag of instance.#renderedTags) {
        RUNTIME.consume(tag);
      }

      const frame = (finalized = verified(initializing, isPresent).done());
      tag = initializeFormulaTag(DEBUG?.Desc("formula", "rendered"), () =>
        frame.children()
      );
      RUNTIME.subscribe(
        tag,
        () => void instance.#publicInstance.$forceUpdate()
      );

      initializing = undefined;
    });

    onBeforeUpdate(() => {
      for (const task of instance.#queued) {
        task();
      }
      instance.#queued.clear();

      initializing = verified(finalized, isPresent).update();
    });

    onUpdated(() => {
      finalized = verified(initializing, isPresent).done();
      RUNTIME.update(verified(tag, isPresent));
    });
  }

  readonly #instance: ComponentInternalInstance;
  readonly #queued = new Set<UpdateTask>();

  /**
   * A set of tags that were created during this instance's setup, and which
   * have associated render tasks. We need these tags to become dependencies of the
   * component so that they trigger a re-render (and run the render tasks).
   */
  readonly #renderedTags: Set<Tag>;

  constructor(instance: ComponentInternalInstance, tags: Set<FormulaTag>) {
    this.#instance = instance;
    this.#renderedTags = tags;
  }

  get app(): StarbeamApp {
    return useApp(this.#instance.appContext.app);
  }

  get #publicInstance() {
    return verified(this.#instance.proxy, isPresent);
  }

  render<T>(reactive: Reactive<T>, task: UpdateTask): void {
    this.#render(reactive, () => {
      this.#publicInstance.$forceUpdate();
      this.#queued.add(task);
    });
  }

  #render(tagged: HasTag, callback: () => void): void {
    RUNTIME.onFinalize(this, RUNTIME.subscribe(tagged, callback));
    this.#renderedTags.add(getTag(tagged));
  }
}

type UpdateTask = () => void;
