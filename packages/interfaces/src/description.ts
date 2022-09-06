import type { ReactiveId } from "./protocol.js";
import type { Stack, StackFrame, StackFrameDisplayOptions } from "./stack.js";

export interface DescriptionArgs {
  /**
   * An identifier for this description that is stable for the value that this description
   * describes.
   *
   * For example, a `Cell` is allowed to return a new description each time its `[REACTIVE]` symbol
   * is read, but the description must have the same `id` each time.
   */
  readonly id: ReactiveId;

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
  api: string | "delegate" | ApiDetails;
  /**
   * An optional description, as provided by the end user. Each instance of an abstraction like
   * `useSetup` should have a different description (this is the distinction between `api` and
   * `fromUser`).
   */
  fromUser?: DescriptionDetails | Description;

  internal?: {
    reason: string;
    userFacing: Description;
  };

  stack?: Stack;
}

export interface DescriptionDescribeOptions extends StackFrameDisplayOptions {
  source?: boolean;
}

export interface Description extends DescriptionArgs {
  readonly fullName: string;
  readonly type: DescriptionType;
  readonly api: string | ApiDetails;
  readonly userFacing: Description;
  readonly parts: DescriptionParts;

  method(
    id: ReactiveId | symbol,
    name: string,
    args?: DescriptionArgument[]
  ): Description;
  /**
   * An index is an integer property access on an object. This access must refer to a stable
   * cell for the lifetime of the object referred to by the parent description.
   */
  index(index: number): Description;
  /**
   * A property is a string property access on an object. This access must refer to a stable
   * cell for the lifetime of the object referred to by the parent description.
   */
  property(name: string): Description;
  /**
   * A `key` is like a property access, but the name is not a string property access. For example,
   * the key passed to `.get` on a map is a key and not a property, because `.get` is not a property
   * access. Unlike `detail`, a key refers to something that the user actually typed in their code.
   *
   * If the key isn't a string, the code creating the description should convert it to a string for
   * display purposes. If that process is lossy (i.e. multiple keys produce the same string), the
   * code creating the description must pass an `id` option that so that the description refers to a
   * stable cell backed by the key.
   */
  key(
    name: string,
    options?: { id?: string | number; note?: string }
  ): Description;
  /**
   * A detail is a representation of a *public* part of a value. Unlike `.property` or `.index`, the
   * user will not have physically typed the name of the detail in the code. Unlike
   * `.implementation`, a *detail* is a part of the public API of the value and can be understood by
   * lay users.
   *
   * If an explicit id is not passed to `.detail`, a detail's name must refer to a stable cell for
   * the lifetime of the object referred to by the parent description.
   */
  detail(
    name: string,
    args?: string[] | { args?: string[]; note?: string; id?: string | number }
  ): Description;
  implementation(
    id: ReactiveId | symbol,
    options?: {
      reason?: string;
      userFacing?: Description;
      stack?: Stack;
    }
  ): Description;

  /**
   * Mark the current description as an implementation detail. This allows the implementation detail
   * to refer to a user-facing concept (such as `.detail` or `.property`).
   */
  asImplementation(options?: { reason: string }): Description;

  withStack(stack: Stack, id: ReactiveId | symbol): Description;
  withId(id?: ReactiveId): Description;

  describe(options?: DescriptionDescribeOptions): string;
  readonly frame: StackFrame | undefined;
}

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
  // represents a value that delegates to another reactive value
  | "delegate"
  | "static"
  | "cell"
  | "formula"
  | "resource"
  | "variants";

/** DescriptionType is `erased` in production */
export type DescriptionType = MarkerType | ValueType | "erased";

export interface MemberDescription {
  type: "member";
  kind: "index" | "property" | "key";
  note?: string;
  parent: Description;
  name: string | number;
}

export interface DetailDescription {
  type: "detail";
  args?: string[];
  note?: string;
  parent: Description;
  name: string;
}

export type DescriptionArgument = string | number | boolean;

interface MethodDescription {
  type: "method";
  parent: Description;
  name: string;
  args?: DescriptionArgument[];
}

interface ValueDescription {
  type: "value";
  name: string;
}

interface AnonymousDescription {
  type: "anonymous";
}

export type DescriptionDetails =
  | string
  | MemberDescription
  | MethodDescription
  | DetailDescription;

export type DetailsPart =
  | MemberDescription
  | MethodDescription
  | DetailDescription
  | ValueDescription
  | AnonymousDescription;

export interface ApiDetails {
  package?: string;
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

export interface InternalDescription {
  reason?: string;
  userFacing: Description;
}

export interface DescriptionParts {
  readonly type: DescriptionType;
  readonly api: ApiDetails;
  readonly details: DetailsPart;
  readonly userFacing: Description;
  readonly internal?: InternalDescription | undefined;
  readonly frame: StackFrame | undefined;
  readonly stack: string | undefined;
}
