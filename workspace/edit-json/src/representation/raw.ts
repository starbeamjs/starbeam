import type * as jsonc from "jsonc-parser";

export interface AbstractRawNode {
  readonly type: jsonc.NodeType;
  readonly offset: number;
  readonly length: number;
  readonly parent?: RawNode;
}

export interface RawJsonArray extends AbstractRawNode {
  readonly type: "array";
  readonly colonOffset?: number;
  readonly children: RawNode[];
}

export interface AbstractRawJsonPrimitive<
  T extends "string" | "number" | "boolean" | "null",
  N extends string | number | boolean | null,
> extends AbstractRawNode {
  readonly type: T;
  readonly value: N;
}

export type RawString = AbstractRawJsonPrimitive<"string", string>;
export type RawNumber = AbstractRawJsonPrimitive<"number", number>;
export type RawBoolean = AbstractRawJsonPrimitive<"boolean", boolean>;
export type RawNull = AbstractRawJsonPrimitive<"null", null>;

export type RawJsonPrimitive = RawString | RawNumber | RawBoolean | RawNull;

export interface RawJsonObject extends AbstractRawNode {
  readonly type: "object";
  readonly children: RawJsonEntry[];
}

export interface RawJsonEntry extends AbstractRawNode {
  readonly type: "property";
  readonly colonOffset: number;
  readonly children: [key: RawString, value: RawValueNode];
}

export type RawValueNode = RawJsonArray | RawJsonObject | RawJsonPrimitive;
export type RawNode = RawValueNode | RawJsonEntry;
