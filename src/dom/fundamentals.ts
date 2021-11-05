/**
 * https://infra.spec.whatwg.org/#namespaces
 */
export const enum Namespace {
  HTML = "http://www.w3.org/1999/xhtml",
  MathML = "http://www.w3.org/1998/Math/MathML",
  SVG = "http://www.w3.org/2000/svg",
  XLink = "http://www.w3.org/1999/xlink",
  XML = "http://www.w3.org/XML/1998/namespace",
  XMLNS = "http://www.w3.org/2000/xmlns/",
}

/**
 * elements that are supported in HTML5 that have a namespace but no prefix
 */
export type ElementNamespace =
  | Namespace.HTML
  | Namespace.SVG
  | Namespace.MathML;

/**
 * attributes handled in HTML5 that get prefix and namespace
 */
export type AttrNamespace = Namespace.XLink | Namespace.XMLNS | Namespace.XML;
