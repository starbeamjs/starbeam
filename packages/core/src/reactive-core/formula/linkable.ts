export class Linkable<T> {
  static create<T>(
    link: (owner: object, extra?: () => void) => T
  ): Linkable<T> {
    return new Linkable(link);
  }

  readonly #link: (owner: object, extra?: () => void) => T;

  private constructor(link: (link: object) => T) {
    this.#link = link;
  }

  create({ owner, extra }: { owner: object; extra?: () => void }): T {
    return this.#link(owner, extra);
  }

  map<U>(mapper: (value: T) => U): Linkable<U> {
    return new Linkable((owner) => {
      const value = this.#link(owner);
      return mapper(value);
    });
  }
}
