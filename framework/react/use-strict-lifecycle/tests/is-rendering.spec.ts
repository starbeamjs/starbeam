// @vitest-environment jsdom

import { html, testStrictAndLoose } from "@starbeam-workspace/react-test-utils";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { expect } from "vitest";

import { isRendering } from "../src/react.js";
import { useLifecycle } from "../src/resource.js";

testStrictAndLoose("useResource", (mode) => {
  const result = mode.test(() => {
    expect(isRendering()).toBe(true);

    const [rendering] = useState(() => {
      return isRendering();
    });

    expect(rendering).toBe(true);

    const renderingMemo = useMemo(() => {
      return isRendering();
    }, []);

    expect(renderingMemo).toBe(true);

    useLayoutEffect(() => {
      expect(isRendering()).toBe(false);

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

    useLifecycle((lifecycle) => {
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

    return { value: isRendering(), dom: html.p("Rendering") };
  });

  expect(result.value).toBe(true);
});
