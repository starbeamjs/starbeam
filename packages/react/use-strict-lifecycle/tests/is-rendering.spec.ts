// @vitest-environment jsdom

import { isRendering, useLifecycle } from "@starbeam/use-strict-lifecycle";
import { html, testReact } from "@starbeam-workspace/react-test-utils";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { expect } from "vitest";

testReact<void, boolean>("useResource", async (root) => {
  const result = root
    .expectHTML((value) => `<p>isRendering = ${String(value)}</p>`)
    .render((state) => {
      expect(isRendering(), "isRendering at the top level").toBe(true);

      const [rendering] = useState(() => {
        return isRendering();
      });

      expect(rendering, "isRendering in a useState callback").toBe(true);

      const renderingMemo = useMemo(() => {
        return isRendering();
      }, []);

      expect(renderingMemo, "isRendering in a useMemo").toBe(true);

      useLayoutEffect(() => {
        expect(isRendering(), "isRendering in useLayoutEffect").toBe(false);

        return () => {
          expect(isRendering()).toBe(false);
        };
      });

      useEffect(() => {
        expect(isRendering()).toBe(false);

        return () => {
          expect(isRendering()).toBe(false);
        };
      });

      useLifecycle().render((lifecycle) => {
        expect(isRendering()).toBe(true);

        lifecycle.on.update(() => {
          expect(isRendering()).toBe(true);
        });

        lifecycle.on.layout(() => {
          expect(isRendering()).toBe(false);
        });

        lifecycle.on.idle(() => {
          expect(isRendering()).toBe(false);
        });

        lifecycle.on.cleanup(() => {
          expect(isRendering()).toBe(false);
        });
      });

      state.value(isRendering());

      return html.p("isRendering = ", String(isRendering()));
    });

  expect(result.value).toBe(true);
});
