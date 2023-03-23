import type { anydom } from "@domtree/flavors";
import type * as interfaces from "@starbeam/interfaces";

export interface DebugTree {
  app: (description: interfaces.Description) => App;
  route: (description: interfaces.Description) => Route;
  component: (description: interfaces.Description) => Component;
  snapshot: () => interfaces.RootNode;
}

export interface App {
  route: (description: interfaces.Description) => Route;
  component: (description: interfaces.Description) => Component;
}

export interface Route {
  component: (description: interfaces.Description) => Component;
}

export interface Component {
  component: (description: interfaces.Description) => Component;
  lifecycle: (timing: "layout" | "idle") => Lifecycle;
  ref: (description: interfaces.Description) => Ref;
  modifier: (timing: "layout" | "idle") => Modifier;
  resource: (reactive: interfaces.Tagged) => interfaces.Unsubscribe;
  domResource: (
    timing: "layout" | "idle",
    reactive: interfaces.Tagged
  ) => interfaces.Unsubscribe;
}

export interface Lifecycle {
  setup: (
    timing: "layout" | "idle",
    protocol: interfaces.Tagged
  ) => interfaces.Unsubscribe;
}

export interface Ref {
  element: (element: anydom.Element | null) => interfaces.Unsubscribe;
}

// intentionally empty for now
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Modifier {}

let PickedDebugTree: DebugTree;

if (import.meta.env.DEV) {
  class RootNode {
    #children: ChildNode[] = [];
    #description?: interfaces.Description;
  }

  class AppNode implements App {
    #children: ChildNode[] = [];
    #description: interfaces.Description;

    constructor(description: interfaces.Description) {
      this.#description = description;
    }

    component(_description: interfaces.Description): Component {
      throw new Error("Method not implemented.");
    }

    route(_description: interfaces.Description): Route {
      throw new Error("Method not implemented.");
    }
  }

  class DebugTreeImpl implements DebugTree {
    #app: AppNode | null = null;
    #root: RootNode = new RootNode();

    app(description: interfaces.Description): App {
      if (!this.#app) {
        this.#app = new AppNode(description);
      }
      return this.#app;
    }

    component(_description: interfaces.Description): Component {
      throw new Error("Method not implemented.");
    }

    route(_description: interfaces.Description): Route {
      throw new Error("Method not implemented.");
    }

    snapshot(): interfaces.RootNode {
      throw new Error("Method not implemented.");
    }
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  class ComponentImpl implements Component {
    #children: interfaces.ComponentNode[] = [];
    #delegate: ChildDelegate;
    #parts: interfaces.ComponentNode[] = [];

    constructor(delegate: ChildDelegate) {
      this.#delegate = delegate;
    }

    component(_description: interfaces.Description): Component {
      throw new Error("Method not implemented.");
    }
    domResource(
      _timing: "layout" | "idle",
      _reactive: interfaces.Tagged
    ): interfaces.Unsubscribe {
      throw new Error("Method not implemented.");
    }
    lifecycle(_timing: "layout" | "idle"): Lifecycle {
      throw new Error("Method not implemented.");
    }
    modifier(_timing: "layout" | "idle"): Modifier {
      throw new Error("Method not implemented.");
    }
    ref(_description: interfaces.Description): Ref {
      throw new Error("Method not implemented.");
    }
    resource(_reactive: interfaces.Tagged): interfaces.Unsubscribe {
      throw new Error("Method not implemented.");
    }
  }

  interface ChildDelegate {
    addChild: (child: ChildNode) => interfaces.Unsubscribe;
  }

  PickedDebugTree = new DebugTreeImpl();
} else {
  const NOOP_UNSUBSCRIBE = (): void => {
    /* noop */
  };

  const EMPTY_ROOT: interfaces.EmptyRoot = {
    type: "empty",
  };

  const NOOP_PROD_TREE: DebugTree = {
    app: (): App => NOOP_APP,
    route: (): Route => NOOP_ROUTE,
    component: (): Component => NOOP_COMPONENT,
    snapshot: () => EMPTY_ROOT,
  };

  const NOOP_APP: App = {
    route: (): Route => NOOP_ROUTE,
    component: (): Component => NOOP_COMPONENT,
  };

  const NOOP_ROUTE: Route = {
    component: (): Component => NOOP_COMPONENT,
  };

  const NOOP_COMPONENT: Component = {
    component: (): Component => NOOP_COMPONENT,
    lifecycle: (): Lifecycle => NOOP_LIFECYCLE,
    ref: (): Ref => NOOP_REF,
    modifier: (): Modifier => NOOP_MODIFIER,
    resource: (): interfaces.Unsubscribe => NOOP_UNSUBSCRIBE,
    domResource: (): interfaces.Unsubscribe => NOOP_UNSUBSCRIBE,
  };
  const NOOP_LIFECYCLE: Lifecycle = {
    setup: (): interfaces.Unsubscribe => NOOP_UNSUBSCRIBE,
  };

  const NOOP_REF: Ref = {
    element: (): interfaces.Unsubscribe => NOOP_UNSUBSCRIBE,
  };

  const NOOP_MODIFIER: Modifier = {};

  PickedDebugTree = NOOP_PROD_TREE;
}

export const DebugTree = PickedDebugTree;
