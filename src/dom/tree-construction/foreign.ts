import type {
  HtmlNamespace,
  MathmlNamespace,
  SvgNamespace,
  XlinkNamespace,
  XmlNamespace,
  XmlnsNamespace,
} from "@domtree/minimal";

export const HTML_NAMESPACE: HtmlNamespace = "http://www.w3.org/1999/xhtml";
export type HTML_NAMESPACE = HtmlNamespace;

export const MATHML_NAMESPACE: MathmlNamespace =
  "http://www.w3.org/1998/Math/MathML";
export type MATHML_NAMESPACE = MathmlNamespace;

export const SVG_NAMESPACE: SvgNamespace = "http://www.w3.org/2000/svg";
export type SVG_NAMESPACE = SvgNamespace;

export type ElementNamespace =
  | HTML_NAMESPACE
  | MATHML_NAMESPACE
  | SVG_NAMESPACE;

export const XLINK_NAMESPACE: XlinkNamespace = "http://www.w3.org/1999/xlink";
export type XLINK_NAMESPACE = XlinkNamespace;

export const XML_NAMESPACE: XmlNamespace =
  "http://www.w3.org/XML/1998/namespace";
export type XML_NAMESPACE = XmlNamespace;

export const XMLNS_NAMESPACE: XmlnsNamespace = "http://www.w3.org/2000/xmlns/";
export type XMLNS_NAMESPACE = XmlnsNamespace;

export type AttributeNamespace =
  | XlinkNamespace
  | XML_NAMESPACE
  | XMLNS_NAMESPACE;
