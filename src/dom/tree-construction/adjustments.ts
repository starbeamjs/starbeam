import { exhaustive } from "../../utils";
import type { AdjustMap } from "./adjust";
import {
  ElementNamespace,
  HTML_NAMESPACE,
  MATHML_NAMESPACE,
  SVG_NAMESPACE,
} from "./foreign";

import { MATHML_ATTRIBUTE_ADJUSTMENTS } from "./mathml";
import { SVG_ATTRIBUTE_ADJUSTMENTS } from "./svg";

export const ATTRIBUTE_ADJUSTMENTS = {
  for(ns: ElementNamespace | null): AdjustMap | null {
    switch (ns) {
      case HTML_NAMESPACE:
      case null:
        return null;
      case SVG_NAMESPACE:
        return SVG_ATTRIBUTE_ADJUSTMENTS;
      case MATHML_NAMESPACE:
        return MATHML_ATTRIBUTE_ADJUSTMENTS;
      default:
        exhaustive(ns);
    }
  },
};
