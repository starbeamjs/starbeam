import type {
  ApiDetails,
  DescriptionArgs,
  DescriptionDescribeOptions,
  DescriptionDetails,
  DescriptionParts,
  DescriptionType,
  DetailsPart,
  StackFrame,
  // eslint-disable-next-line import/no-duplicates
} from "@starbeam/interfaces";
// eslint-disable-next-line import/no-duplicates
import type * as interfaces from "@starbeam/interfaces";
import { exhaustive } from "@starbeam/verify";
import chalk from "chalk";

import { isDebug } from "../conditional.js";
import { DisplayStruct } from "../inspect/display-struct.js";
import { DisplayParts } from "../module.js";
import type { Stack } from "../stack.js";

export let PickedDescription: DescriptionStatics;

export interface DescriptionStatics {
  is(description: unknown): description is interfaces.Description;
  from(args: DescriptionArgs): interfaces.Description;
}

if (isDebug()) {
  let id = 0;

  class DebugDescription implements interfaces.Description, DescriptionArgs {
    static is(description: unknown): description is interfaces.Description {
      return !!(description && description instanceof DebugDescription);
    }

    static from(args: DescriptionArgs): interfaces.Description {
      if (DebugDescription.is(args)) {
        return args;
      } else if (DebugDescription.is(args.fromUser)) {
        return args.fromUser;
      }

      return new DebugDescription(
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

    readonly #id = id++;

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
          reason?: string;
          userFacing: DescriptionArgs;
        }
      | undefined;

    #stack?: Stack | undefined;

    constructor(
      type: DescriptionType,
      api: string | ApiDetails,
      details: DescriptionDetails | undefined,
      internal: { reason?: string; userFacing: DescriptionArgs } | undefined,
      stack: Stack | undefined
    ) {
      this.#type = type;
      this.#api = api;
      this.#details = details;
      this.#internal = internal;
      this.#stack = stack;
    }

    [Symbol.for("nodejs.util.inspect.custom")](): object {
      return DisplayStruct("Description", {
        id: this.#id,
        type: this.#type,
        api: this.#api,
        details: this.#details,
        internal: this.#internal,
        stack: this.#stack,
      });
    }

    get type(): DescriptionType {
      return this.#type;
    }

    get api(): string | ApiDetails {
      return this.#api;
    }

    get userFacing(): interfaces.Description {
      if (this.#internal) {
        return DebugDescription.from(this.#internal.userFacing);
      } else {
        return this;
      }
    }

    get isAnonymous(): boolean {
      return this.#details === undefined;
    }

    withStack(stack: Stack): interfaces.Description {
      return new DebugDescription(
        this.#type,
        this.#api,
        this.#details,
        this.#internal,
        stack
      );
    }

    implementation(details?: {
      reason: string;
      userFacing: interfaces.Description;
    }) {
      return new DebugDescription(
        this.#type,
        this.#api,
        this.#details,
        {
          reason: details?.reason,
          userFacing: details?.userFacing ?? this.userFacing,
        },
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
        return `{${this.#id}:anonymous ${this.type}}`;
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
                case "key": {
                  return `->${this.#details.name}`;
                }
              }

            case "detail": {
              const detail = chalk.dim(`->${this.#details.name}`);

              if (this.#details.args) {
                return `${detail}(${this.#details.args
                  .map((a) => chalk.magenta(a))
                  .join(", ")})`;
              } else {
                return detail;
              }
            }

            case "method":
              return `.${this.#details.name}()`;

            default:
              exhaustive(this.#details);
          }
        }
      } else {
        return `{anonymous ${this.type}}`;
      }
    }

    method(this: DebugDescription, name: string): interfaces.Description {
      return new DebugDescription(
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

    index(this: DebugDescription, index: number): interfaces.Description {
      return new DebugDescription(
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

    property(this: DebugDescription, name: string): interfaces.Description {
      return new DebugDescription(
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

    detail(
      this: DebugDescription,
      name: string,
      args?: string[] | { args?: string[]; note?: string }
    ): interfaces.Description {
      let detailArgs: string[] | undefined;
      let note: string | undefined;

      if (Array.isArray(args)) {
        detailArgs = args;
      } else if (args) {
        detailArgs = args.args;
        note = args.note;
      }

      return new DebugDescription(
        "formula",
        this.#api,
        {
          type: "detail",
          parent: this,
          name,
          args: detailArgs,
          note,
        },
        undefined,
        this.#stack
      );
    }

    /**
     * A key represents a string that the user wrote in their source code. In contrast, `detail`,
     * represents a user-facing *concept* that created by Starbeam, and `implementation` represents
     * a concept that normal users don't have enough context to understand (but which can be
     * revealed by passing `implementation: true` to the debug APIs).
     */
    key(
      this: DebugDescription,
      name: string,
      note?: string
    ): interfaces.Description {
      return new DebugDescription(
        "formula",
        this.#api,
        {
          type: "member",
          kind: "key",
          parent: this,
          name,
          note,
        },
        undefined,
        this.#stack
      );
    }

    get parts(): DescriptionParts {
      return {
        type: this.#type,
        api: this.#apiPart,
        details: this.#detailsPart,
        frame: this.#stack?.caller,
        stack: this.#stack?.stack,
      };
    }

    get #apiPart(): ApiDetails {
      if (typeof this.#api === "string") {
        return {
          name: this.#api,
        };
      } else {
        return this.#api;
      }
    }

    get #detailsPart(): DetailsPart {
      if (typeof this.#details === "string") {
        return { type: "value", name: this.#details };
      } else if (this.#details === undefined) {
        return { type: "anonymous" };
      } else {
        return this.#details;
      }
    }

    describe(options: DescriptionDescribeOptions = {}): string {
      const name = this.#name(options);

      if (this.#internal) {
        const desc = this.#internal.reason
          ? chalk.dim(`[${this.#internal.reason}]`)
          : chalk.dim("[internals]");
        return `${name} ${desc}`;
      } else {
        return name;
      }
    }

    #name(options: DescriptionDescribeOptions): string {
      if ((this.isAnonymous || options.source) ?? false) {
        return `${this.fullName} @ ${this.#caller(options)}`;
      } else {
        return this.fullName;
      }
    }

    #caller(options?: DescriptionDescribeOptions): string {
      const caller = this.#stack?.caller;

      if (caller !== undefined) {
        return caller.display(options);
      } else {
        return "<unknown>";
      }
    }

    get frame(): StackFrame | undefined {
      return this.#stack?.caller;
    }
  }

  PickedDescription = DebugDescription;
} else {
  class ProdDescription implements interfaces.Description {
    static PROD = new ProdDescription();

    static is(description: unknown): description is interfaces.Description {
      return !!(description && description instanceof ProdDescription);
    }

    static from(): interfaces.Description {
      return ProdDescription.PROD;
    }

    readonly fullName = "";
    readonly type = "erased";
    readonly api = "";
    readonly fromUser = undefined;
    readonly internal = undefined;
    readonly stack = undefined;
    readonly userFacing = this;
    readonly parts: DescriptionParts = {
      api: { name: "erased" },
      details: { type: "anonymous" },
      type: "erased",
      frame: undefined,
      stack: undefined,
    };
    readonly frame: StackFrame = {
      parts: () => new DisplayParts({ path: "" }),
      link: () => "",
      display: () => "",
    };

    method(): interfaces.Description {
      return this;
    }

    index(): interfaces.Description {
      return this;
    }

    property(): interfaces.Description {
      return this;
    }

    key(): interfaces.Description {
      return this;
    }

    detail(): interfaces.Description {
      return this;
    }

    implementation(_options?: { reason: string }): interfaces.Description {
      return this;
    }

    withStack(): interfaces.Description {
      return this;
    }

    describe(): string {
      return "";
    }
  }

  PickedDescription = ProdDescription;
}

export type Description = interfaces.Description;
export const Description: DescriptionStatics = PickedDescription;
