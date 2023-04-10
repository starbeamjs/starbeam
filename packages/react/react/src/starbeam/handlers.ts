export interface Handlers {
  readonly layout: Set<Callback>;
  readonly idle: Set<Callback>;
  readonly cleanup: Set<Callback>;
}

export function Handlers(): Handlers {
  return {
    layout: new Set(),
    cleanup: new Set(),
    idle: new Set(),
  };
}

export function invoke(handlers: Handlers, ...types: (keyof Handlers)[]): void {
  for (const type of types) {
    for (const callback of handlers[type]) {
      callback();
    }
  }
}

export function onHandlers(handlers: () => Handlers): RegisterHandlers {
  return {
    layout: (callback: () => void) => {
      handlers().layout.add(callback);
    },
    idle: (callback: () => void) => {
      handlers().idle.add(callback);
    },
    cleanup: (callback: () => void) => {
      handlers().cleanup.add(callback);
    },
  };
}

export type Callback = () => void;

export interface RegisterHandlers {
  readonly layout: (callback: Callback) => void;
  readonly idle: (callback: Callback) => void;
  readonly cleanup: (callback: Callback) => void;
}
