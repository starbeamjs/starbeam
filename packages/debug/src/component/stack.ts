import type { anydom } from "@domtree/flavors";
import type {
  ComponentNode,
  Description,
  EmptyRoot,
  ReactiveProtocol,
  RootNode,
  Unsubscribe,
} from "@starbeam/interfaces";
import type * as interfaces from "@starbeam/interfaces";
import { isDebug } from "../conditional.js";

export interface DebugTree {
  app(description: Description): App;
  route(description: Description): Route;
  component(description: Description): Component;
  snapshot(): RootNode;
}

export interface App {
  route(description: Description): Route;
  component(description: Description): Component;
}

export interface Route {
  component(description: Description): Component;
}

export interface Component {
  component(description: Description): Component;
  lifecycle(timing: "layout" | "idle"): Lifecycle;
  ref(description: Description): Ref;
  modifier(timing: "layout" | "idle"): Modifier;
  resource(reactive: ReactiveProtocol): Unsubscribe;
  domResource(
    timing: "layout" | "idle",
    reactive: ReactiveProtocol
  ): Unsubscribe;
}

export interface Lifecycle {
  setup(timing: "layout" | "idle", protocol: ReactiveProtocol): Unsubscribe;
}

export interface Ref {
  element(element: anydom.Element | null): Unsubscribe;
}

export interface Modifier {}

let PickedDebugTree: DebugTree;

if (isDebug()) {
  class RootNode {
    #children: ChildNode[] = [];
    #description?: Description;
  }

  class AppNode implements App {
    #children: ChildNode[] = [];
    #description: Description;

    constructor(description: Description) {
      this.#description = description;
    }
    route(description: Description): Route {
      throw new Error("Method not implemented.");
    }
    component(description: Description): Component {
      throw new Error("Method not implemented.");
    }
  }

  class DebugTreeImpl implements DebugTree {
    #root: RootNode = new RootNode();
    #app: AppNode | null = null;

    app(description: Description): App {
      if (!this.#app) {
        this.#app = new AppNode(description);
      }
      return this.#app;
    }

    route(description: Description): Route {
      throw new Error("Method not implemented.");
    }

    component(description: Description): Component {
      throw new Error("Method not implemented.");
    }
    snapshot(): interfaces.RootNode {
      throw new Error("Method not implemented.");
    }
  }

  class ComponentImpl implements Component {
    #delegate: ChildDelegate;
    #parts: ComponentNode[] = [];
    #children: ComponentNode[] = [];

    constructor(delegate: ChildDelegate) {
      this.#delegate = delegate;
    }

    component(description: Description): Component {
      throw new Error("Method not implemented.");
    }
    lifecycle(timing: "layout" | "idle"): Lifecycle {
      throw new Error("Method not implemented.");
    }
    ref(description: Description): Ref {
      throw new Error("Method not implemented.");
    }
    modifier(timing: "layout" | "idle"): Modifier {
      throw new Error("Method not implemented.");
    }
    resource(reactive: ReactiveProtocol): Unsubscribe {
      throw new Error("Method not implemented.");
    }
    domResource(
      timing: "layout" | "idle",
      reactive: ReactiveProtocol
    ): Unsubscribe {
      throw new Error("Method not implemented.");
    }
  }

  interface ChildDelegate {
    addChild(child: ChildNode): Unsubscribe;
  }

  PickedDebugTree = new DebugTreeImpl();
} else {
  const NOOP_UNSUBSCRIBE = () => {};

  const EMPTY_ROOT: EmptyRoot = {
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
    resource: (): Unsubscribe => NOOP_UNSUBSCRIBE,
    domResource: (): Unsubscribe => NOOP_UNSUBSCRIBE,
  };
  const NOOP_LIFECYCLE: Lifecycle = {
    setup: (): Unsubscribe => NOOP_UNSUBSCRIBE,
  };

  const NOOP_REF: Ref = {
    element: (): Unsubscribe => NOOP_UNSUBSCRIBE,
  };

  const NOOP_MODIFIER: Modifier = {};

  PickedDebugTree = NOOP_PROD_TREE;
}

export const DebugTree = PickedDebugTree;
