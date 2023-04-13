import { useState } from "react";

/**
 * This hook produces a unique instance representing the current React
 * component. If it's called multiple times inside a single React component,
 * it will return the same instance.
 *
 * It returns the same instance even in strict mode when the component
 * is rendered multiple times.
 *
 * It doesn't use other Starbeam hooks, since it is used to build those hooks.
 */
export function useComponentInstance(): object {
  // we can't use useRef here, since it will produce a different instance
  // each time `useComponentInstance` is called, and we want multiple calls
  // to return the same instance. The same problem exists with `useState` taking
  // a callback or useMemo.

  // We use `useState` to get a unique instance for each component, and then
  // we use `useState` to store the instance in a ref.
  const [instance] = useState(() => ({}));
  const [, _setInstance] = useState(instance);
  return instance;
}
