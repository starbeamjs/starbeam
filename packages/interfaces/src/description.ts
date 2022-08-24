import type { Stack, StackFrame, StackFrameDisplayOptions } from "./stack.js";

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

export interface DescriptionDescribeOptions extends StackFrameDisplayOptions {
  source?: boolean;
}

export interface Description extends DescriptionArgs {
  readonly fullName: string;
  readonly type: DescriptionType;
  readonly api: string | ApiDetails;
  readonly userFacing: Description;
  readonly parts: DescriptionParts;

  method(name: string): Description;
  index(index: number): Description;
  property(name: string): Description;
  detail(
    name: string,
    args?: string[] | { args?: string[]; note?: string }
  ): Description;
  key(name: string): Description;
  implementation(options?: {
    reason?: string;
    userFacing?: Description;
  }): Description;

  withStack(stack: Stack): Description;

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

interface MethodDescription {
  type: "method";
  parent: Description;
  name: string;
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

export interface DescriptionParts {
  readonly type: DescriptionType;
  readonly api: ApiDetails;
  readonly details: DetailsPart;
  readonly userFacing?: Description | undefined;
  readonly frame: StackFrame | undefined;
  readonly stack: string | undefined;
}
