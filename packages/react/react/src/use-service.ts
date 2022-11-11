import { CONTEXT } from "@starbeam/timeline";
import {
  type Blueprint,
  type ResourceFactory,
  service,
} from "@starbeam/universal";

import { useStarbeamApp } from "./context-provider.js";
import { useReactive } from "./use-reactive.js";

export function useService<T>(factory: Blueprint<T> | ResourceFactory<T>): T {
  CONTEXT.app = useStarbeamApp({ feature: "useService()" });
  return useReactive(() => service(factory));
}
