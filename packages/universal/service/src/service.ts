import type { Description } from "@starbeam/interfaces";
import type { FormulaFn } from "@starbeam/reactive";
import { CachedFormula, DEBUG, Marker } from "@starbeam/reactive";
import type { ResourceBlueprint, SyncFn } from "@starbeam/resource";
import { Resource } from "@starbeam/resource";
import { CONTEXT } from "@starbeam/runtime";
import { mountFinalizationScope } from "@starbeam/shared";

/**
 * The `Service` function takes a resource blueprint and turns it into a
 * service: a resource that is created once and then shared across all
 * components rendered within a given app instance.s
 */
export function Service<T>(
  blueprint: ResourceBlueprint<T>,
  {
    description,
    app = CONTEXT.app,
  }: { description?: string | Description | undefined; app?: object } = {},
): ResourceBlueprint<T> {
  return Resource(
    ({ use }) => {
      return CONTEXT.create(
        blueprint,
        () => {
          return use(blueprint);
        },
        { app },
      );
    },
    DEBUG?.Desc("service", description),
  );
}

interface ServiceState {
  readonly marker: Marker;
  readonly syncs: Set<SyncFn<void>>;
  readonly formula: FormulaFn<void>;
}

const SERVICES = new WeakMap<object, ServiceState>();

function initializeServices(app: object): ServiceState {
  let services = SERVICES.get(app);

  if (!services) {
    const marker = Marker();
    const syncs = new Set<SyncFn<void>>();

    const formula = CachedFormula(() => {
      marker.read();
      for (const sync of syncs) sync();
    });

    services = { marker, syncs, formula };
    SERVICES.set(app, services);
  }

  return services;
}

function addService(app: object, service: SyncFn<void>) {
  const { syncs, marker } = initializeServices(app);
  syncs.add(service);
  marker.mark();
}

/**
 * The formula returned by `getServiceFormula` can be subscribed to. The
 * subscription is notified when any of the app's services have updates.
 *
 * @category primitive
 */
export function getServiceFormula(app: object): FormulaFn<void> {
  return initializeServices(app).formula;
}

export function service<const T>(
  resource: ResourceBlueprint<T>,
  {
    description: _description,
    app = CONTEXT.app,
  }: {
    description?: string | Description | undefined;
    app?: object | undefined;
  } = {},
): T {
  return CONTEXT.create(
    resource,
    () => {
      const done = mountFinalizationScope(app);
      try {
        const { sync, value } = resource.setup();

        addService(app, sync);

        return value;
      } finally {
        done();
      }
    },
    { app },
  );
}
