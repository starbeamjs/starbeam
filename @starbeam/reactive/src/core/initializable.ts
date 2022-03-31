import { failure } from "@starbeam/fundamental";
import { Enum } from "@starbeam/utils";
import { Reactive } from "../reactive.js";
import { Marker } from "./marker.js";

export class Initializable<T> extends Enum(
  "Uninitialized(T)",
  "Initialized(U)"
)<Marker, { readonly marker: Marker; readonly value: T }> {
  static create<T>(description: string): Initializable<T> {
    return Initializable.Uninitialized(Marker(description));
  }

  static initialized<T>(marker: Marker, value: T): Initializable<T> {
    return Initializable.Initialized({ marker, value });
  }

  get #marker(): Marker {
    return this.match({
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
    return this.match({
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
    return this.match({
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
    return this.match({
      Uninitialized: () => {
        failure(
          `Uninitialized values cannot be updated. Did you mean initialize()?`
        );
      },
      Initialized: ({ marker }) => Initializable.initialized(marker, value),
    });
  }

  get value(): T {
    return this.match({
      Initialized: ({ value }) => value,
      Uninitialized: () => {
        failure(
          `Initializable values should not be accessed before they were initialized`
        );
      },
    });
  }
}

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
