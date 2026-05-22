import type { StarbeamValue } from "./reactive.js";
import { fromStarbeam } from "./reactive.js";

type Getter<T> = () => T;

const REACTIVE_VALUES = new WeakMap<
  object,
  Map<PropertyKey, StarbeamValue<unknown>>
>();

function getValueFor<T>(
  instance: object,
  key: PropertyKey,
  getter: Getter<T>,
): StarbeamValue<T> {
  let values = REACTIVE_VALUES.get(instance);

  if (!values) {
    values = new Map();
    REACTIVE_VALUES.set(instance, values);
  }

  let value = values.get(key) as StarbeamValue<T> | undefined;

  if (!value) {
    value = fromStarbeam(() => getter.call(instance), { parent: instance });
    values.set(key, value);
  }

  return value;
}

/**
 * Bridge a getter that reads Starbeam state into Ember's autotracking system.
 *
 * The decorated getter returns the computed value directly. Ember templates,
 * `@cached` getters, helpers, and modifiers can read it as a normal Glimmer
 * value while Starbeam invalidations dirty the internal Glimmer tag.
 */
export function reactive<T>(
  _target: object,
  key: string | symbol,
  descriptor: TypedPropertyDescriptor<T>,
): TypedPropertyDescriptor<T> {
  const getter = descriptor.get;

  if (!getter) {
    throw new Error("@reactive can only decorate getters");
  }

  return {
    ...descriptor,
    get(this: object): T {
      return getValueFor(this, key, getter).current;
    },
  };
}
