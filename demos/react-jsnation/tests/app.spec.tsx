// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { App } from "@starbeam-demos/jsnation";

describe("react-jsnation", () => {
  afterEach(cleanup);

  test("App loads DataTable", () => {
    render(<App />);

    const main = within(screen.getByRole("main"));
    expect(main.getByText("Create a new user")).toBeDefined();
  });

  test("App loads LocaleSelector", () => {
    render(<App />);

    expect(screen.getByText("My Locale")).toBeDefined();
  });
});
