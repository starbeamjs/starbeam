import type { Tag } from "../tag.js";
import type { CallStack, StackFrame } from "./call-stack.js";

export type ReactiveType =
  | Tag["type"]
  | "resource"
  | "service"
  | "collection"
  | "collection:item";

export type DescFn = (
  type: ReactiveType,
  specified?: string | Description | undefined,
  api?: Api | string | undefined
) => Description | undefined;

export type ReactiveId = number | string | ReactiveId[];

export interface DescriptionDetails {
  readonly id: ReactiveId;
  readonly type: ReactiveType;
  readonly api?: Api | undefined;
  readonly caller: CallStack | undefined;
  readonly nesting?: Nesting | undefined;
  /**
   * The user-specified description, if specified.
   */
  readonly specified?: string | undefined;
}

export interface Description extends DescriptionDetails {
  readonly frame: StackFrame | undefined;
  readonly isAnonymous: boolean;
  readonly api: Api | undefined;
  readonly nesting: Nesting | undefined;

  index: (index: number) => Description;
  property: (name: string) => Description;
  key: (key: { name: string; key: unknown } | string | number) => Description;
  detail: (type: ReactiveType, name: string, args?: string[]) => Description;
  implementation: (
    type: ReactiveType,
    name: string,
    reason: string
  ) => Description;
}

export type Api = FunctionApi | MethodApi | SimpleFunctionApi;

export interface SomeApi {
  readonly package: string;
  readonly module: string;
  readonly type: "function" | "method";
}

/**
 * While it would be nice to reliably have the package and module for all
 * functions, we can't always get it. In those situations, we try to infer the
 * function name through the call stack, and also allow the user to specify a
 * simple string that represents the function. `SimpleFunctionApi` is used to
 * represent that.
 */
export interface SimpleFunctionApi {
  readonly type: "simple";
  readonly name: string;
  readonly caller: CallStack | undefined;
}

export interface FunctionApi extends SomeApi {
  readonly type: "function";
  readonly name: string;
}

export interface MethodApi extends SomeApi {
  readonly type: "method";
  readonly class: string;
  readonly placement: "static" | "instance";
}

export type Nesting = ChildType & {
  readonly parent: DescriptionDetails;
};

export type ChildType =
  | {
      readonly type: "index";
      readonly value: number;
    }
  | {
      readonly type: "property";
      readonly value: string;
    }
  | {
      readonly type: "key";
      readonly value: { name: string; key: unknown };
    }
  | {
      readonly type: "detail";
      readonly value: { name: string; args: string[] };
    }
  | {
      readonly type: "implementation";
      readonly value: { name: string; reason: string };
    };
