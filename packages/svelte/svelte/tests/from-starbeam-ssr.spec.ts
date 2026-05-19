/* eslint-disable @typescript-eslint/no-magic-numbers */

import { Cell } from "@starbeam/universal";
import {
  describe,
  expect,
  RecordedEvents,
  test,
} from "@starbeam-workspace/test-utils";
import { render as renderServer } from "svelte/server";

import FromStarbeamSSR from "./fixtures/FromStarbeamSSR.svelte";

describe("fromStarbeam SSR", () => {
  test("computes synchronously during server render", () => {
    const count = Cell(3);
    const events = new RecordedEvents();
    const result = renderServer(FromStarbeamSSR, { props: { count, events } });

    expect(result.body).toBe("<!--[--><p>6</p><!--]-->");
    events.expect("compute");
  });
});
