import type { PresentArray } from "@starbeam/core-utils";

import type { CellTag } from "../tag.js";
import type { Tagged } from "../tagged.js";
import type { CallerStackFn, CallStack } from "./call-stack.js";
import type { DescFn, DescriptionDetails } from "./description.js";

export type DescribeOptions =
  | {
      id: boolean | undefined;
    }
  | undefined;

export interface DebugRuntime {
  getUserFacing: <D extends DescriptionDetails | undefined>(
    description: D
  ) => D;
  describe: (
    description: DescriptionDetails,
    options?: DescribeOptions
  ) => string;
  describeTagged: (tagged: Tagged, options?: DescribeOptions) => string;
  readonly untrackedReadBarrier: (
    barrier: (tag: CellTag, stack: CallStack | undefined) => void | never
  ) => void;
  readonly callerStack: CallerStackFn;

  /**
   * Mark the current function as a debug entry point. The immediate caller of a
   * debug entry point becomes the call stack associated with any debug
   * information generated for that entry point.
   *
   * @param options.caller Optionally specify an explicit caller. By default,
   * the caller is the parent frame of the function that called markEntryPoint.
   * @param options.description Optionally specify a label for the entry.
   * @param options.force By default, if there is already a debug entry point,
   * this entry point will become an implementation detail of the current entry
   * point. If `force` is set to `true`, this entry point will completely replace
   * the current entry point.
   */
  markEntryPoint: (
    options?:
      | {
          caller?: CallStack | undefined;
          description?: EntryPointDescriptionArg | string | undefined;
          force?: boolean | undefined;
        }
      | EntryPointDescriptionArg
      | EntryPoint
      | string
  ) => EntryPoint;
  getEntryPoint: () => EntryPoint | undefined;

  readonly Desc: DescFn;
}

export interface EntryPoint {
  readonly label: string;
  caller: CallStack | undefined;
  description: EntryPointDescription | undefined;
  implementation: PresentArray<EntryPoint> | null;
}

export interface EntryPointDescription {
  readonly label: string;
}

export type EntryPointDescriptionArg =
  | ["label", string]
  | [
      operation: "reactive:read" | "reactive:write" | "reactive:call",
      entity: DescriptionDetails | string | undefined,
      api: ["object:get" | "object:set" | "object:call", PropertyKey]
    ]
  | [
      operation:
        | "object:get"
        | "object:set"
        | "object:has"
        | "object:call"
        | "object:define"
        | "object:delete"
        | "object:meta:get",
      entity: DescriptionDetails | string | undefined,
      target: PropertyKey
    ]
  | [
      operation: "object:meta:keys",
      entity: DescriptionDetails | string | undefined
    ]
  | [
      operation: "function:call",
      entity: DescriptionDetails | string | undefined
    ]
  | [
      operation:
        | "collection:has"
        | "collection:get"
        | "collection:insert"
        | "collection:delete",
      entity: DescriptionDetails | string | undefined,
      key: unknown
    ];
