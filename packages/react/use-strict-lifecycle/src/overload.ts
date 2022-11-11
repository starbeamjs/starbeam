type Matcher<
  In extends readonly unknown[],
  Out,
  Unhandled extends number
> = Unhandled extends infer K
  ? K extends number
    ? { [P in K]: (...args: Extract<In, { length: P }>) => Out }
    : never
  : never;

export function Overload<Out>(): {
  of: <In extends unknown[]>(input: In) => OverloadImpl<In, Out, In["length"]>;
  resolve: <In extends unknown[]>(
    input: In,
    matcher: Matcher<In, Out, In["length"]>
  ) => Out;
} {
  return {
    of: <In extends readonly unknown[]>(input: In) =>
      new OverloadImpl<In, Out, In["length"]>(input, undefined),
    resolve: <In extends readonly unknown[]>(
      input: In,
      matcher: Matcher<In, Out, In["length"]>
    ) => {
      return new OverloadImpl<In, Out, In["length"]>(input, matcher).resolve(
        matcher
      );
    },
  };
}

class OverloadImpl<
  In extends readonly unknown[],
  Out,
  Unhandled extends number
> {
  static of<In extends readonly unknown[]>(
    args: In
  ): OverloadImpl<In, never, In["length"]> {
    return new OverloadImpl(args, undefined);
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

  resolve(this: OverloadImpl<In, Out, never>): Out;
  resolve(
    this: OverloadImpl<In, Out, Unhandled>,
    matcher: Matcher<In, Out, Unhandled>
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
  ): OverloadImpl<In, Out, Exclude<Unhandled, keyof H>> {
    return new OverloadImpl(this.#args, {
      ...this.#matcher,
      ...match,
    });
  }
}
