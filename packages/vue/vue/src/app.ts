import { finalize } from "@starbeam/shared";
import { isPresent, verified } from "@starbeam/verify";
import { type App, getCurrentInstance } from "vue";

const APPS = new WeakMap<App, StarbeamApp>();

export class StarbeamApp {
  static initialized(app: App): StarbeamApp {
    let starbeamApp = APPS.get(app);

    if (!starbeamApp) {
      starbeamApp = new StarbeamApp(app);
      APPS.set(app, starbeamApp);
      StarbeamApp.#setup(starbeamApp);
    }

    return starbeamApp;
  }

  static #setup(app: StarbeamApp): void {
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
  app = verified(getCurrentInstance(), isPresent).appContext.app,
): StarbeamApp {
  return StarbeamApp.initialized(app);
}
