export function Overload<Out, Len extends number = never>(): {
  of: <In extends unknown[], InLen extends number = Len | In["length"]>(
    input: In
  ) => TypedOverload<In, Out, InLen>;
  resolve: <In extends unknown[], M extends Matcher<In, Out, In["length"]>>(
    input: In,
    matcher: M
  ) => Out;
} {
  return {
    of: <In extends readonly unknown[], Len extends number = In["length"]>(
      input: In
    ): TypedOverload<In, Out, Len> =>
      new TypedOverload<In, Out, Len>(input, undefined),
    resolve: <In extends readonly unknown[]>(
      input: In,
      matcher: Matcher<In, Out, In["length"]>
    ): Out => {
      return new TypedOverload<In, Out, In["length"]>(input, matcher).resolve(
        matcher
      );
    },
  };
}

export class TypedOverload<
  In extends readonly unknown[],
  Out,
  Unhandled extends number
> {
  static of<In extends readonly unknown[]>(
    args: In
  ): TypedOverload<In, never, In["length"]> {
    return new TypedOverload(args, undefined);
  }

  readonly #args: In;
  readonly #matcher: Record<number, unknown> | undefined;

  constructor(args: In, matcher: Record<number, unknown> | undefined) {
    this.#args = args;
    this.#matcher = matcher;
  }

  #match(orElse?: (...args: unknown[]) => Out): Out {
    const match = this.#matcher?.[this.#args.length] as
      | ((...args: unknown[]) => readonly unknown[])
      | undefined;
    if (match) {
      return match(...this.#args) as Out;
    } else if (orElse) {
      return orElse(...this.#args);
    } else {
      throw new Error(`no match for ${this.#args.length} arguments`);
    }
  }

  resolve(this: TypedOverload<In, Out, never>): Out;
  resolve<H extends Matcher<In, Out, Unhandled>>(
    this: TypedOverload<In, Out, Unhandled>,
    matcher: H
  ): Out;
  resolve(matcher?: Matcher<In, Out, Unhandled>): Out {
    if (matcher) {
      return this.match(matcher).resolve();
    }
    return this.#match();
  }

  else(orElse: (...args: Extract<In, { length: Unhandled }>) => Out): Out {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return
    return this.#match(orElse as any) as any;
  }

  match<H extends Matcher<In, Out, Unhandled>>(
    match: H
  ): TypedOverload<In, Out, Exclude<Unhandled, keyof H>> {
    return new TypedOverload(this.#args, {
      ...this.#matcher,
      ...match,
    });
  }
}

export type Matcher<
  In extends readonly unknown[],
  Out,
  Unhandled extends number
> = {
  [P in Unhandled]: (...args: Extract<In, { length: P }>) => Out;
};
