import { RUNTIME } from "@starbeam/runtime";
import { getServiceFormula } from "@starbeam/service";
import { finalize } from "@starbeam/shared";
import { isPresent, verified } from "@starbeam/verify";
import type { App } from "vue";
import {
  getCurrentInstance,
  onMounted,
  onUnmounted,
  shallowRef,
  triggerRef,
  watch,
} from "vue";

const APPS = new WeakMap<App, StarbeamApp>();

/**
 * An object that uniquely represents a Vue {@linkcode App}.
 *
 * It is finalized when the app's root component is unmounted.
 */
export class StarbeamApp {
  /**
   *
   * @param app The Vue app that this StarbeamApp is based on
   * @param initialize Optionally, a function that should be run when the app is
   *   initialized
   */
  static initialized(
    app: App,
    initialize?: (app: StarbeamApp) => void,
  ): StarbeamApp {
    let starbeamApp = APPS.get(app);

    if (!starbeamApp) {
      starbeamApp = new StarbeamApp(app);
      APPS.set(app, starbeamApp);
      StarbeamApp.#setup(starbeamApp);
      initialize?.(starbeamApp);
    }

    return starbeamApp;
  }

  static #setup(app: StarbeamApp): void {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const prevUnmount = app.#vue.unmount;

    app.#vue.unmount = () => {
      finalize(app);
      prevUnmount();
    };
  }

  readonly #vue: App;

  constructor(app: App) {
    this.#vue = app;
  }
}

export function useApp(
  vueApp = verified(getCurrentInstance(), isPresent).appContext.app,
): StarbeamApp {
  return StarbeamApp.initialized(vueApp, (app) => {
    const services = getServiceFormula(app);
    const servicesRef = shallowRef();

    const unsubscribe = RUNTIME.subscribe(
      services,
      () => void triggerRef(servicesRef),
    );

    onMounted(() => {
      watch(servicesRef, services, { immediate: true });
    });

    onUnmounted(() => {
      unsubscribe?.();
    });
  });
}
