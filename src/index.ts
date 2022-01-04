import { ReactiveCases } from "./reactive/choice";
export const Cases = ReactiveCases.define;

export * from "./reactive/index";
export * from "./universe";
export * from "./program-node/index";
export * from "./program-node/data";
export * from "./program-node/attribute";
export type { Component } from "./program-node/component";
export * from "./dom";
export { HTML_NAMESPACE } from "./dom/streaming/namespaces";
export {
  CompatibleAttr,
  CompatibleCharacterData,
  CompatibleChildNode,
  CompatibleDocument,
  CompatibleDocumentFragment,
  CompatibleElement,
  CompatibleNode,
  CompatibleParentNode,
  CompatibleTemplateElement,
  COMPATIBLE_DOM as DOM,
} from "./dom/streaming/compatible-dom";

export * from "./utils";
export * from "./strippable/assert";
export * from "./strippable/minimal";
export * from "./strippable/wrapper";
export * from "./dom/streaming";
