// @vitest-environment jsdom
import { App } from "@starbeam-demos/react-jsnation";
import { testReact } from "@starbeam-workspace/react-test-utils";
import { describe, expect } from "@starbeam-workspace/test-utils";
import { ErrorBoundary } from "react-error-boundary";

describe("react-jsnation", () => {
  testReact<void, void>("App loads DataTable", async (root) => {
    const result = await root.render((state) => {
      state.value(undefined);
      return (
        <ErrorBoundary fallbackRender={() => <p>Error</p>}>
          <App />
        </ErrorBoundary>
      );
    });

    expect(
      () => result.findByText("Error"),
      "getting the error element",
    ).toThrow();
    expect(result.findByText("Create a new user").innerHTML).toBeDefined();
  });

  testReact<void, void>("App loads locale selector", async (root) => {
    const result = await root.render((state) => {
      state.value(undefined);
      return (
        <ErrorBoundary fallbackRender={() => <p>Error</p>}>
          <App />
        </ErrorBoundary>
      );
    });

    expect(
      () => result.findByText("Error"),
      "getting the error element",
    ).toThrow();
    expect(result.findByText("My Locale").innerHTML).toBeDefined();
  });

  //   afterEach(cleanup);

  //   test("App loads DataTable", () => {
  //     const result = render(<App />, { legacyRoot: true });

  //     expect(result.getByText("Create a new user")).toBeDefined();
  //   });

  //   test("App loads LocaleSelector", () => {
  //     render(<App />);

  //     expect(screen.getByText("My Locale")).toBeDefined();
  //   });
});
