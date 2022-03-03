interface Person {
  readonly name: string;
  readonly age?: number;
}

type ImmutableObject = {
  [P in keyof any]?: Immutable;
};

type Immutable = string | number | boolean | Immutable[] | ImmutableObject;

type NarrowNested<P extends Immutable> = {
  readonly [K in keyof P]: P[K] extends Immutable
    ? NarrowNested<P[K]>
    : Readonly<P[K]>;
} & P;

function check<R extends readonly [string, Person][] & Immutable>(
  ...people: NarrowNested<R>
): NarrowNested<R> {}

check(
  [
    "jonas",
    {
      name: "Jonas",
      age: 5,
      even: { more: [{ nested: ["omg", "stuff"] }, "stuff"] },
    },
  ],
  ["yehuda", { name: "Yehuda", date: "today" }]
);

function check2<R extends Person>(person: NarrowNested<R>): NarrowNested<R> {}

check2({ name: "Yehuda", date: "today", even: { more: ["nested", "stuff"] } });
