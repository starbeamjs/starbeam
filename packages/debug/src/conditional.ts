// TODO: Make this a build time concern

const DEBUG = import.meta.env ? !import.meta.env.PROD : false;

export function isDebug(): boolean {
  return DEBUG;
}

export function isProd(): boolean {
  return !DEBUG;
}

interface Class<T = object> {
  new (...args: unknown[]): T;
  prototype: T;
}

interface Method<T = object> {
  (this: T, ...args: unknown[]): unknown;
}

/* a decorator that is intended to be used by the build to hide code that is only needed in debug
 * builds.
 *
 * Note that this evades TypeScript type checking, so it's important that if you use this to erase a
 * method from the production build, that it's only used inside other methods annotated with
 * `ifDebug` or inside of blocks annotated with an `isDebug` check.
 */
export function ifDebug<C>(target: C): C | void;
export function ifDebug<C extends Class>(
  target: C["prototype"],
  propertyKey: PropertyKey,
  descriptor: PropertyDescriptor
): PropertyDescriptor | void;
export function ifDebug<C extends Class>(
  target: C["prototype"],
  propertyKey?: PropertyKey,
  descriptor?: TypedPropertyDescriptor<unknown>
): PropertyDescriptor | void {
  if (propertyKey === undefined || descriptor === undefined) {
    if (isProd()) {
      return undefined;
    } else {
      return target;
    }
  }

  if (isProd()) {
    return {
      configurable: false,
      get: () => {
        throw new Error(
          `Attempted to access property ${String(propertyKey)} on ${String(
            target
          )} in a production build.`
        );
      },
      set: () => {
        throw new Error(
          `Attempted to set property ${String(propertyKey)} on ${String(
            target
          )} in a production build.`
        );
      },
    };
  }

  const originalMethod = descriptor.value;

  if (isMethod<Method>(originalMethod)) {
    descriptor.value = function (this: C["prototype"], ...args: unknown[]) {
      return originalMethod.apply(this, args);
    };

    Object.defineProperty(target, propertyKey, descriptor);
  }

  if (descriptor.get) {
    const originalGetter = descriptor.get;

    descriptor.get = function (this: C["prototype"]) {
      return originalGetter.call(this);
    } as unknown as Method;
  }

  if (descriptor.set) {
    const originalSetter = descriptor.set;

    descriptor.set = function (this: C["prototype"], value: unknown) {
      return originalSetter.call(this, value);
    } as unknown as Method;
  }

  Object.defineProperty(target, propertyKey, descriptor);
}

function isMethod<T extends Method>(value: unknown | T): value is T {
  return typeof value === "function";
}
