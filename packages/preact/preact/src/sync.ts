import type { Unsubscribe } from "@starbeam/interfaces";
import type { Sync } from "@starbeam/resource";
import { RUNTIME } from "@starbeam/runtime";
import { onFinalize } from "@starbeam/shared";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";

import { getCurrentComponent } from "./options.js";

export function setupSync(sync: Sync): void {
  const [notify, setNotify] = useState({});
  const activeSync = useMemo(() => {
    return sync(getCurrentComponent());
  }, []);
  const unsubscribe = useRef(null as null | Unsubscribe);
  const component = getCurrentComponent();

  useEffect(() => {
    if (unsubscribe.current === null) {
      onFinalize(component, () => {
        console.log("HI");
      });

      const activeSync = sync(component);
      unsubscribe.current = RUNTIME.subscribe(
        activeSync,
        () => void setNotify({}),
      );
    }

    activeSync();

    return () => {
      unsubscribe.current?.();
    };
  }, [notify]);
}
