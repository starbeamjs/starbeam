import type { Reactive } from "./reactive.js";

export function Custom<A>(
  this: void,
  create: (builder: CustomBuilder) => A
): CustomBlueprint<A> {
  return {
    setup: () => {
      const builder = new CustomBuilder();
      return create(builder);
    },
  };
}

Custom.create = Custom;

Custom.class = <A extends readonly unknown[], R>(
  create: new (...args: A) => R
): ((...args: A) => CustomBlueprint<R>) => {
  return (...args: A) => CustomBlueprint.fn(() => new create(...args));
};

Custom.fn = <A extends readonly unknown[], R>(
  create: (...args: A) => R
): ((...args: A) => CustomBlueprint<R>) => {
  return (...args: A) => CustomBlueprint.fn(() => create(...args));
};

export class CustomBuilder {}

export class CustomBlueprint<T> {
  static fn<T>(
    this: void,
    create: (builder: CustomBuilder) => T
  ): CustomBlueprint<T> {
    return new CustomBlueprint(create);
  }

  readonly setup: () => T;

  private constructor(setup: (builder: CustomBuilder) => T) {
    const builder = new CustomBuilder();
    this.setup = () => setup(builder);
  }
}

export type CustomInstance<T> = Reactive<T> | T;
export type CustomInstanceValue<I extends () => CustomInstance<unknown>> =
  ReturnType<I> extends Reactive<infer T>
    ? Reactive<T>
    : Reactive<ReturnType<I>>;
