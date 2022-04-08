import { failure } from "@starbeam/fundamental";
import { Enum } from "@starbeam/utils";
import { Reactive } from "../reactive.js";
import { Marker } from "./marker.js";

type Uninitialized = Marker;

interface Initialized<T> {
  readonly marker: Marker;
  readonly value: T;
}

export class Initializable<T> extends Enum(
  "Uninitialized(T)",
  "Initialized(U)"
)<Uninitialized, Initialized<T>> {
  static create<T>(description: string): Initializable<T> {
    return Initializable.Uninitialized(Marker(description));
  }

  static initialized<T>(marker: Marker, value: T): Initializable<T> {
    return Initializable.Initialized({ marker, value });
  }

  get #marker(): Marker {
    return super.match({
      Initialized: ({ marker }) => marker,
      Uninitialized: (marker) => marker,
    });
  }

  get description(): string {
    return Reactive.description(this.#marker);
  }

  upsert<U>({
    create,
    update,
  }: {
    create: (description: string) => {
      readonly initialized: T;
      readonly value: U;
    };
    update: (
      current: T,
      description: string
    ) => { readonly updated: T; readonly value: U };
  }): { readonly initialized: Initializable<T>; readonly value: U } {
    return super.match({
      Uninitialized: (marker) => {
        marker.update();
        const { initialized, value } = create(Reactive.description(marker));
        return {
          initialized: Initializable.initialized(marker, initialized),
          value,
        };
      },
      Initialized: ({ marker, value }) => {
        const { updated, value: newValue } = update(
          value,
          Reactive.description(marker)
        );
        return {
          initialized: Initializable.initialized(marker, updated),
          value: newValue,
        };
      },
    });
  }

  initialize(value: T): Initializable<T> {
    return super.match({
      Uninitialized: (marker) => {
        marker.update();
        marker.freeze();
        return Initializable.initialized(marker, value);
      },
      Initialized: () => {
        failure(`Initializable values can only be initialized once`);
      },
    });
  }

  update(value: T): Initializable<T> {
    return super.match({
      Uninitialized: () => {
        failure(
          `Uninitialized values cannot be updated. Did you mean initialize()?`
        );
      },
      Initialized: ({ marker }) => Initializable.initialized(marker, value),
    });
  }

  /**
   * @deprecated in Initializable, use `map` or `matchVariants` instead of Enum's `match`
   *
   * TODO: Composition over inheritance
   */
  declare match;

  #match<V>(matcher: {
    Initialized: (value: Initialized<T>) => V;
    Uninitialized: (value: Uninitialized) => V;
  }): V {
    this.#marker.consume();

    return super.match(matcher);
  }

  matchVariants<V>(matcher: {
    Initialized: (value: T) => V;
    Uninitialized: () => V;
  }): V {
    return this.#match({
      Initialized: ({ value }) => matcher.Initialized(value),
      Uninitialized: () => matcher.Uninitialized(),
    });
  }

  map<V>(mapper: (value: T) => V): Initializable<V> {
    this.#marker.consume();

    return super.match({
      Initialized: ({ marker, value }) =>
        Initializable.initialized(marker, mapper(value)),
      Uninitialized: (marker) => Initializable.Uninitialized(marker),
    });
  }

  get value(): T {
    return this.#match({
      Initialized: ({ value }) => value,
      Uninitialized: () => {
        failure(
          `Initializable values should not be accessed before they were initialized`
        );
      },
    });
  }
}

type Public<T> = {
  [P in keyof T]: T[P];
};

// export class Initializable<T> {
//   static create<T>(description: string): Initializable<T> {
//     return new Initializable<T>(Marker(description), UNINITIALIZED);
//   }

//   readonly #marker: Marker;
//   #value: UNINITIALIZED | T;

//   private constructor(marker: Marker, value: UNINITIALIZED | T) {
//     this.#marker = marker;
//     this.#value = value;
//   }

//   initialize(value: T): void {
//     assert(
//       this.#value !== UNINITIALIZED,
//       `An assumption was incorrect: Initializable can only be initialized once`
//     );

//     this.#marker.update();
//     this.#marker.freeze();

//     this.#value = value;
//   }

//   get value(): T {
//     assert(
//       this.#value !== UNINITIALIZED,
//       `An assumption was incorrect: Initializable values should not be accessed before they were initialized`
//     );

//     return this.#value;
//   }
// }
