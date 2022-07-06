import type { Stack, StackFrame } from "../stack.js";

export type MarkerType =
  | "collection:key-value"
  | "collection:value"
  | "collection:value:entry"
  | "collection:key-value:entry";

export type ValueType =
  | "implementation"
  // represents a value that is not Starbeam-reactive, but is reactive according to the rules of the
  // external framework embedding Starbeam (e.g. React)
  | "external"
  // represents a renderer value
  | "renderer"
  | "static"
  | "cell"
  | "formula"
  | "resource";

export type DescriptionType = MarkerType | ValueType;

export interface MemberDescription {
  type: "member";
  kind: "index" | "property" | "key";
  parent: Description;
  name: string | number;
}

interface MethodDescription {
  type: "method";
  parent: Description;
  name: string;
}

export type DescriptionDetails = string | MemberDescription | MethodDescription;

interface ApiDetails {
  package: string;
  module?: string;
  // default is allowed here
  name: string;
  method?:
    | {
        type: "static";
        name: string;
      }
    | {
        type: "instance";
        name: string;
      };
}

export interface DescriptionArgs {
  /**
   * The type is a high-level categorization from the perspective of Starbeam. It is used in
   * developer tools to decide how to render the description.
   */
  type: DescriptionType;
  /**
   * The {@linkcode api} is the user-facing, public API entry point that the developer used to
   * construct the thing that this description is describing. For example, the `useSetup` hook in
   * `@starbeam/react` has the type "resource" and the api "useStarbeam".
   */
  api: string | ApiDetails;
  /**
   * An optional description, as provided by the end user. Each instance of an abstraction like
   * `useSetup` should have a different description (this is the distinction between `api` and
   * `fromUser`).
   */
  fromUser?: DescriptionDetails | Description;

  internal?: {
    reason: string;
    userFacing: DescriptionArgs;
  };

  stack?: Stack;
}

export class Description implements DescriptionArgs {
  static from(args: DescriptionArgs): Description {
    if (args instanceof Description) {
      return args;
    } else if (args.fromUser instanceof Description) {
      return args.fromUser;
    }

    return new Description(
      args.type,
      args.api,
      args.fromUser,
      args.internal,
      args.stack
    );
  }

  /**
   * The type is a high-level categorization from the perspective of Starbeam. It is used in
   * developer tools to decide how to render the description.
   */
  readonly #type: DescriptionType;

  /**
   * The {@linkcode DescriptionArgs.api} is the user-facing, public API entry point that the developer used to
   * construct the thing that this description is describing. For example, the `useSetup` hook in
   * `@starbeam/react` has the type "resource" and the api "useStarbeam".
   */
  readonly #api: string | ApiDetails;
  /**
   * Optional additional details, provided by the end user. The `DescriptionDetails` may represent a
   * part of a parent description (see {@linkcode MemberDescription},
   * {@linkcode MethodDescription}). In those cases, they are still rooted in end-user supplied
   * description details .
   */
  readonly #details: DescriptionDetails | undefined;

  #internal:
    | {
        reason: string;
        userFacing: DescriptionArgs;
      }
    | undefined;

  #stack?: Stack | undefined;

  constructor(
    type: DescriptionType,
    api: string | ApiDetails,
    details: DescriptionDetails | undefined,
    internal: { reason: string; userFacing: DescriptionArgs } | undefined,
    stack: Stack | undefined
  ) {
    this.#type = type;
    this.#api = api;
    this.#details = details;
    this.#internal = internal;
    this.#stack = stack;
  }

  get type(): DescriptionType {
    return this.#type;
  }

  get api(): string | ApiDetails {
    return this.#api;
  }

  get userFacing(): Description {
    if (this.#internal) {
      return Description.from(this.#internal.userFacing);
    } else {
      return this;
    }
  }

  get isAnonymous(): boolean {
    return this.#details === undefined;
  }

  implementation(details: { reason: string }) {
    return new Description(
      this.#type,
      this.#api,
      this.#details,
      { reason: details.reason, userFacing: this.userFacing },
      this.#stack
    );
  }

  get fullName(): string {
    if (this.#details !== undefined) {
      if (typeof this.#details === "string") {
        return this.#details;
      } else {
        return `${this.#details.parent.fullName}${this.fromUser}`;
      }
    } else {
      return `{anonymous ${this.type}}`;
    }
  }

  get fromUser(): string {
    if (this.#details) {
      if (typeof this.#details === "string") {
        return this.#details;
      } else {
        switch (this.#details.type) {
          case "member":
            switch (this.#details.kind) {
              case "index":
                return `[${this.#details.name}]`;
              case "property":
                return `.${this.#details.name}`;
              case "key":
                return `->${this.#details.name}`;
            }
            break;

          case "method":
            return `.${this.#details.name}()`;
        }
      }
    } else {
      return `{anonymous ${this.type}}`;
    }
  }

  method(this: Description, name: string): Description {
    return new Description(
      "formula",
      this.#api,
      {
        type: "method",
        parent: this,
        name,
      },
      undefined,
      this.#stack
    );
  }

  index(this: Description, index: number): Description {
    return new Description(
      "formula",
      this.#api,
      {
        type: "member",
        parent: this,
        kind: "index",
        name: index,
      },
      undefined,
      this.#stack
    );
  }

  property(this: Description, name: string): Description {
    return new Description(
      "formula",
      this.#api,
      {
        type: "member",
        parent: this,
        kind: "property",
        name,
      },
      undefined,
      this.#stack
    );
  }

  key(this: Description, name: string): Description {
    return new Description(
      "formula",
      this.#api,
      {
        type: "member",
        kind: "key",
        parent: this,
        name,
      },
      undefined,
      this.#stack
    );
  }

  describe({ source = false }: { source?: boolean } = {}): string {
    if (this.isAnonymous || source) {
      return `${this.fullName} @ ${this.#caller}`;
    } else {
      return this.fullName;
    }
  }

  get #caller(): string {
    const caller = this.#stack?.caller;

    if (caller !== undefined) {
      return caller.display;
    } else {
      return "<unknown>";
    }
  }

  get frame(): StackFrame | undefined {
    return this.#stack?.caller;
  }
}
