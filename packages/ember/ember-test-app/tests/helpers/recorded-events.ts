import type Assert from "qunit/qunit/qunit";

/**
 * Minimal mirror of `@starbeam-workspace/test-utils`'s `RecordedEvents`,
 * adapted for QUnit so we don't drag the vitest-flavoured workspace util into
 * a browser test environment.
 *
 * Usage:
 *
 *   const events = new RecordedEvents();
 *   events.record("first");
 *   events.expect(assert, ["first"]);
 *   // events is reset after every `expect`.
 */
export class RecordedEvents {
  #events: string[] = [];

  readonly record = (event: string): void => {
    this.#events.push(event);
  };

  expect(assert: Assert, expected: string[], message?: string): void {
    const actual = this.#events;
    this.#events = [];
    assert.deepEqual(actual, expected, message);
  }
}
