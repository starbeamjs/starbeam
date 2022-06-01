export class Linkable<T> {
  static create<T>(link: (owner: object) => T): Linkable<T> {
    return new Linkable(link);
  }

  readonly #link: (owner: object) => T;

  private constructor(link: (link: object) => T) {
    this.#link = link;
  }

  owner(owner: object): T {
    return this.#link(owner);
  }

  map<U>(mapper: (value: T) => U): Linkable<U> {
    return new Linkable((owner) => {
      const value = this.#link(owner);
      return mapper(value);
    });
  }
}
