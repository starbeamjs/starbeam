export class Brand {
  readonly #reactive = new WeakMap<object, true>();

  brand(object: object): void {
    this.#reactive.set(object, true);
  }

  is(object: object): boolean {
    return this.#reactive.has(object);
  }
}

export const REACTIVE_BRAND = new Brand();
export const OUTPUT_BRAND = new Brand();