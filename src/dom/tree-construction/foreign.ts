export const HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
export type HTML_NAMESPACE = typeof HTML_NAMESPACE;

export const MATHML_NAMESPACE = "http://www.w3.org/1998/Math/MathML";
export type MATHML_NAMESPACE = typeof MATHML_NAMESPACE;

export const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
export type SVG_NAMESPACE = typeof SVG_NAMESPACE;

export type ElementNamespace =
  | HTML_NAMESPACE
  | MATHML_NAMESPACE
  | SVG_NAMESPACE;

export const XLINK_NAMESPACE = "http://www.w3.org/1999/xlink";
export type XLINK_NAMESPACE = typeof XLINK_NAMESPACE;

export const XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace";
export type XML_NAMESPACE = typeof XML_NAMESPACE;

export const XMLNS_NAMESPACE = "http://www.w3.org/2000/xmlns/";
export type XMLNS_NAMESPACE = typeof XMLNS_NAMESPACE;

export type AttributeNamespace =
  | XLINK_NAMESPACE
  | XML_NAMESPACE
  | XMLNS_NAMESPACE;
