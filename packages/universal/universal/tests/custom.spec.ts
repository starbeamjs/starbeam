import type { CustomBlueprint } from "@starbeam/universal";
import { type IntoReactive, Reactive } from "@starbeam/universal";
import { Cell, Custom, Formula } from "@starbeam/universal";
import { describe, expect, test } from "vitest";

describe("Custom reactive objects", () => {
  test("a custom reactive object containing a cell", () => {
    const Counter = Custom(() => {
      const count = Cell(0);

      return {
        get count() {
          return count.current;
        },

        increment() {
          count.update((value) => value + 1);
        },
      };
    });

    const counter = Counter.setup();
    expect(counter.count).toBe(0);
    counter.increment();
    expect(counter.count).toBe(1);

    // multiple instance of Counter have their own state
    const counter2 = Counter.setup();
    expect(counter2.count).toBe(0);
    counter2.increment();
    expect(counter2.count).toBe(1);
    expect(counter.count).toBe(1);

    counter.increment();
    expect(counter.count).toBe(2);
  });

  test("a custom reactive object parameters and returning a formula", () => {
    function FormattedDate(
      date: IntoReactive<Date>,
      locale?: IntoReactive<string>
    ): CustomBlueprint<Reactive<string>> {
      return Custom(() => {
        const formatter = Formula(
          () =>
            new Intl.DateTimeFormat(Reactive.read(locale), {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
        );

        return Formula(() => {
          return formatter().format(Reactive.read(date));
        });
      });
    }

    // create a cell containing a date for January 1, 2020
    const date = Cell(new Date(2020, 0, 1));

    const withoutLocale = FormattedDate(date).setup();
    expect(withoutLocale.current).toBe("January 1, 2020");

    const withLocale = FormattedDate(date, Cell("en-GB")).setup();
    expect(withLocale.current).toBe("1 January 2020");

    date.update((value) => new Date(value.setFullYear(2021)));
    expect(withoutLocale.current).toBe("January 1, 2021");
    expect(withLocale.current).toBe("1 January 2021");
  });

  test("a custom reactive object taking generic parameters", () => {
    function Person<S extends string>(
      name: IntoReactive<S>
    ): CustomBlueprint<{ name: Reactive<S>; age: number }> {
      return Custom(() => {
        const age = Cell(0);
        return {
          name: Reactive.from(name),

          get age() {
            return age.current;
          },

          set age(value: number) {
            age.set(value);
          },
        };
      });
    }

    const person = Person("John").setup();

    expect(person.name.current).toBe("John");
    expect(person.age).toBe(0);

    person.age = 10;
    expect(person.age).toBe(10);
  });

  test("a custom reactive object returning an instance of a class that takes generic parameters", () => {
    const Person = Custom.fn(
      <S extends string>(name: IntoReactive<S>) => new GenericImpl(name)
    );

    const person = Person("John").setup();

    expect(person.name).toBe("John");
    expect(person.age).toBe(0);

    person.age = 10;
    expect(person.age).toBe(10);
  });

  test("a custom reactive object using Custom.class with a generic class", () => {
    const Person = Custom.class(GenericImpl);

    const person = Person("John").setup();

    expect(person.name).toBe("John");
    expect(person.age).toBe(0);

    person.age = 10;
    expect(person.age).toBe(10);
  });

  test("a custom reactive object returning an instance of a class", () => {
    const Counter = Custom.fn(() => new CounterImpl());

    const counter = Counter().setup();
    expect(counter.count).toBe(0);

    counter.increment();
    expect(counter.count).toBe(1);

    // multiple instance of Counter have their own state
    const counter2 = Counter().setup();
    expect(counter2.count).toBe(0);
    counter2.increment();
    expect(counter2.count).toBe(1);
    expect(counter.count).toBe(1);

    counter.increment();
    expect(counter.count).toBe(2);
    expect(counter2.count).toBe(1);
  });
});

class GenericImpl<S extends string> {
  readonly #name: Reactive<S>;
  readonly #age = Cell(0);

  constructor(name: IntoReactive<S>) {
    this.#name = Reactive.from(name);
  }

  get name(): S {
    return this.#name.current;
  }

  get age(): number {
    return this.#age.current;
  }

  set age(value: number) {
    this.#age.set(value);
  }
}

class CounterImpl {
  #cell = Cell(0);

  get count(): number {
    return this.#cell.current;
  }

  increment(): void {
    this.#cell.update((value) => value + 1);
  }
}
