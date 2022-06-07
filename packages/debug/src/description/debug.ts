import type { Stack } from "../stack.js";

export class Description {
  static create(kind: string, stack: Stack, specified?: string): Description {
    return new Description(kind, stack, specified, undefined);
  }

  #stack: Stack | undefined;
  #kind: string;
  #specified: string | undefined;
  #parent: Description | undefined;

  constructor(
    kind: string,
    stack: Stack | undefined,
    specified: string | undefined,
    parent: Description | undefined
  ) {
    this.#stack = stack;
    this.#kind = kind;
    this.#specified = specified;
    this.#parent = parent;
  }

  implementation(kind: string, specified?: string | undefined): Description {
    return new Description(kind, undefined, specified, this);
  }

  member(description: string) {
    return new Description(
      `${this.#kind}${description}`,
      this.#stack,
      this.#specified,
      this.#parent
    );
  }

  /**
   * Returns true if this description represents implementation details.
   */
  isImplementation(): boolean {
    return !!this.#parent;
  }

  /**
   * Returns the user-facing description. If this description is an
   * implementation detail, return the user-facing description that the
   * implementation detail is part of.
   */
  userFacing(): Description {
    if (this.#parent) {
      return this.#parent.userFacing();
    } else {
      return this;
    }
  }

  /**
   *
   * @param options.source include the source code that created this object
   * @param options.implementation include descriptions that are implementation details
   */
  describe({
    source,
    implementation = false,
  }: { source?: boolean; implementation?: boolean } = {}): string {
    if (this.#parent && !implementation) {
      console.log({
        parent: this.#parent,
        implementation,
        userFacing: this.userFacing().describe({ source }),
      });

      return this.userFacing().describe({ source });
    }

    const kind = this.#kind;
    const stack = this.#stack;
    const specified = this.#specified;
    const caller = stack?.caller?.display ?? "<unknown>";

    let description = kind;

    if (specified) {
      description += ` (${specified})`;

      if (source) {
        description += ` at ${caller}`;
      }
    } else if (!this.#parent && source !== false) {
      description += ` @ ${caller}`;
    }

    return description;
  }
}
