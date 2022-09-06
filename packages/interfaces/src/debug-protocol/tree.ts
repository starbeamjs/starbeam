import type { Description, ReactiveProtocol } from "@starbeam/interfaces";
import type * as anydom from "@domtree/any";

export interface INode {
  readonly type: string;
  readonly description: Description;
}

export type ChildNode = ComponentNode | RouteNode;

/**
 * A `RootNode` is a node that is a valid root of a tree. Ideally, the framework has established its
 * "app" concept with Starbeam, and the root node is the root of the app's tree. However, it's also
 * possible to use Starbeam without an established app concept, in which case the root node is a
 * component.
 *
 * In production mode, the root node is always `EmptyRoot`.
 */
export type RootNode = ComponentNode | AppNode | UnknownAppNode | EmptyRoot;

export interface AppNode extends INode {
  readonly type: "app";
  readonly children: ChildNode[];
}

export interface UnknownAppNode {
  readonly type: "app:unknown";
  readonly children: ChildNode[];
}

export interface EmptyRoot {
  readonly type: "empty";
}

/**
 * A `RouteNode` is a node that represents an established "route" according to the frameworks.
 * Routes may be nested (if the framework supports nested routes).
 */
export interface RouteNode extends INode {
  readonly type: "route";
  readonly children: ChildNode[];
}

export interface ComponentNode extends INode {
  readonly type: "component";
  readonly parts: ComponentPart[];
  readonly children: ComponentNode[];
}

export interface LifecyclePart extends INode {
  readonly type: "lifecycle";
  readonly timing: "layout" | "idle";
  readonly setups: ReactiveProtocol[];
}

export interface RefPart extends INode {
  readonly type: "ref";
  readonly element: anydom.Element | null;
}

export interface ModifierPart extends INode {
  readonly type: "modifier";
  readonly timing: "layout" | "idle";
  readonly ref: RefPart;
}

export interface DomResourcePart extends INode {
  readonly type: "resource:dom";
  readonly timing: "layout" | "idle";
  readonly reactive: ReactiveProtocol;
}

export interface ResourcePart extends INode {
  readonly type: "resource";
  readonly reactive: ReactiveProtocol;
}

export type ComponentPart =
  | LifecyclePart
  | RefPart
  | ModifierPart
  | ResourcePart
  | DomResourcePart;
