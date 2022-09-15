import type * as interfaces from "@starbeam/interfaces";
import { getID } from "@starbeam/shared";
import { exhaustive } from "@starbeam/verify";
import chalk from "chalk";

import { isDebug } from "../conditional.js";
import { DisplayStruct } from "../inspect/display-struct.js";
import { DisplayParts } from "../module.js";
// eslint-disable-next-line import/no-cycle
import { type Stack, callerStack } from "../stack.js";

/**
 * This symbol is used in APIs that accept an ID to indicate that an existing ID should be reused.
 * This value should never be used as an ID.
 */
export const REUSE_ID = Symbol.for("starbeam.id:reuse");
export type REUSE_ID = typeof REUSE_ID;

/**
 * This symbol is used in production mode to indicate that there is no description available. This
 * value should never be used as an ID.
 */
export const ERASED_ID = Symbol.for("starbeam.id:erased");
export type ERASED_ID = typeof ERASED_ID;

let PickedDescription: DescriptionStatics;

export interface DescriptionStatics {
  is(description: unknown): description is interfaces.Description;
  from(args: interfaces.DescriptionArgs): interfaces.Description;
}

if (isDebug()) {
  class DebugDescription
    implements interfaces.Description, interfaces.DescriptionArgs
  {
    static is(description: unknown): description is interfaces.Description {
      return !!(description && description instanceof DebugDescription);
    }

    static from(args: interfaces.DescriptionArgs): interfaces.Description {
      if (DebugDescription.is(args)) {
        return args;
      } else if (DebugDescription.is(args.fromUser)) {
        return args.fromUser;
      }

      return new DebugDescription(
        args.id ?? getID(),
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
    readonly #type: interfaces.DescriptionType;

    readonly #id: interfaces.ReactiveId;

    get #idName(): string {
      if (typeof this.#id === "string" || typeof this.#id === "number") {
        return String(this.#id);
      } else {
        return this.#id.map(String).join("/");
      }
    }

    /**
     * The {@linkcode DescriptionArgs.api} is the user-facing, public API entry point that the developer used to
     * construct the thing that this description is describing. For example, the `useSetup` hook in
     * `@starbeam/react` has the type "resource" and the api "useStarbeam".
     */
    readonly #api: string | interfaces.ApiDetails;
    /**
     * Optional additional details, provided by the end user. The `DescriptionDetails` may represent a
     * part of a parent description (see {@linkcode MemberDescription},
     * {@linkcode MethodDescription}). In those cases, they are still rooted in end-user supplied
     * description details .
     */
    readonly #details: interfaces.DescriptionDetails | undefined;

    #internal:
      | {
          reason?: string;
          userFacing: Description;
        }
      | undefined;

    #stack?: Stack | undefined;

    constructor(
      id: interfaces.ReactiveId,
      type: interfaces.DescriptionType,
      api: string | interfaces.ApiDetails,
      details: interfaces.DescriptionDetails | undefined,
      internal: { reason?: string; userFacing: Description } | undefined,
      stack: Stack | undefined
    ) {
      this.#id = id;
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

    #newId(id: interfaces.ReactiveId | REUSE_ID): interfaces.ReactiveId {
      return id === REUSE_ID ? this.#id : id;
    }

    #extendId(id: interfaces.ReactiveId): interfaces.ReactiveId {
      if (Array.isArray(this.#id)) {
        return [...this.#id, id];
      } else {
        return [this.#id, id];
      }
    }

    get id(): interfaces.ReactiveId {
      return this.#id;
    }

    get type(): interfaces.DescriptionType {
      return this.#type;
    }

    get api(): string | interfaces.ApiDetails {
      return this.#api;
    }

    get userFacing(): interfaces.Description {
      if (this.#internal) {
        return this.#internal.userFacing;
      } else {
        return this;
      }
    }

    get isAnonymous(): boolean {
      return this.#details === undefined;
    }

    withId(id?: interfaces.ReactiveId): interfaces.Description {
      if (id === undefined) {
        return this;
      }

      return new DebugDescription(
        id,
        this.#type,
        this.#api,
        this.#details,
        this.#internal,
        this.#stack
      );
    }

    withStack(
      stack: Stack,
      id: interfaces.ReactiveId | REUSE_ID
    ): interfaces.Description {
      return new DebugDescription(
        this.#newId(id),
        this.#type,
        this.#api,
        this.#details,
        this.#internal,
        stack
      );
    }

    get #parent(): interfaces.Description | void {
      if (typeof this.#details === "object") {
        return this.#details.parent;
      }
    }

    asImplementation(options?: { reason: string }): interfaces.Description {
      return new DebugDescription(
        this.#id,
        this.#type,
        this.#api,
        this.#details,
        {
          reason: options?.reason,
          userFacing: this.#parent ?? this,
        },
        this.#stack
      );
    }

    implementation(
      id: interfaces.ReactiveId,
      details?: {
        reason: string;
        userFacing: interfaces.Description;
        stack?: Stack;
      }
    ) {
      return new DebugDescription(
        this.#extendId(id),
        this.#type,
        this.#api,
        this.#details,
        {
          reason: details?.reason,
          userFacing: details?.userFacing ?? this.userFacing,
        },
        details?.stack ?? callerStack()
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
        return `{${this.#idName}:anonymous ${this.type}}`;
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

    method(
      this: DebugDescription,
      id: interfaces.ReactiveId | REUSE_ID,
      name: string,
      args?: interfaces.DescriptionArgument[]
    ): interfaces.Description {
      return new DebugDescription(
        this.#newId(id),
        "formula",
        this.#api,
        {
          type: "method",
          parent: this,
          name,
          args,
        },
        undefined,
        this.#stack
      );
    }

    index(this: DebugDescription, index: number): interfaces.Description {
      return new DebugDescription(
        this.#extendId(index),
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
        this.#extendId(name),
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
      args?: string[] | { args?: string[]; note?: string; id?: string | number }
    ): interfaces.Description {
      let detailArgs: string[] | undefined;
      let note: string | undefined;
      let id: interfaces.ReactiveId;

      if (Array.isArray(args)) {
        detailArgs = args;
        id = this.#extendId(name);
      } else if (args) {
        detailArgs = args.args;
        note = args.note;
        id = this.#extendId(args.id ?? name);
      } else {
        id = this.#extendId(name);
      }

      return new DebugDescription(
        id,
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
      options?: { id?: string | number; note?: string }
    ): interfaces.Description {
      return new DebugDescription(
        this.#extendId(options?.id ? [name, options.id] : name),
        "formula",
        this.#api,
        {
          type: "member",
          kind: "key",
          parent: this,
          name,
          note: options?.note,
        },
        undefined,
        this.#stack
      );
    }

    get parts(): interfaces.DescriptionParts {
      return {
        type: this.#type,
        api: this.#apiPart,
        details: this.#detailsPart,
        userFacing: this.#internal ? this.#internal.userFacing : this,
        frame: this.#stack?.caller,
        stack: this.#stack?.stack,
        internal: this.#internal,
      };
    }

    get #apiPart(): interfaces.ApiDetails {
      if (typeof this.#api === "string") {
        return {
          name: this.#api,
        };
      } else {
        return this.#api;
      }
    }

    get #detailsPart(): interfaces.DetailsPart {
      if (typeof this.#details === "string") {
        return { type: "value", name: this.#details };
      } else if (this.#details === undefined) {
        return { type: "anonymous" };
      } else {
        return this.#details;
      }
    }

    describe(options: interfaces.DescriptionDescribeOptions = {}): string {
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

    #name(options: interfaces.DescriptionDescribeOptions): string {
      if ((this.isAnonymous || options.source) ?? false) {
        return `${this.fullName} @ ${this.#caller(options)}`;
      } else {
        return this.fullName;
      }
    }

    #caller(options?: interfaces.DescriptionDescribeOptions): string {
      const caller = this.#stack?.caller;

      if (caller !== undefined) {
        return caller.display(options);
      } else {
        return "<unknown>";
      }
    }

    get frame(): interfaces.StackFrame | undefined {
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

    readonly id: interfaces.ReactiveId = "@starbeam:erased";
    readonly fullName = "";
    readonly type = "erased";
    readonly api = "";
    readonly fromUser = undefined;
    readonly internal = undefined;
    readonly stack = undefined;
    readonly userFacing = this;
    readonly parts: interfaces.DescriptionParts = {
      api: { name: "erased" },
      details: { type: "anonymous" },
      userFacing: this,
      type: "erased",
      frame: undefined,
      stack: undefined,
    };
    readonly frame: interfaces.StackFrame = {
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

    asImplementation(): interfaces.Description {
      return this;
    }

    implementation(): interfaces.Description {
      return this;
    }

    withId(): interfaces.Description {
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
