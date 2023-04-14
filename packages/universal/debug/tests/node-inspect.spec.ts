import { inspector } from "@starbeam/core-utils";
import { describe, expect, test } from "vitest";

class Person {
  #name: string;
  #location: string;
  #tag: string | undefined;

  constructor(name: string, location: string, tag?: string) {
    this.#name = name;
    this.#location = location;
    this.#tag = tag;
  }

  static {
    inspector(this).define((person, debug) =>
      debug.struct(
        {
          name: person.#name,
          location: person.#location,
        },
        person.#tag === undefined ? undefined : { description: person.#tag }
      )
    );
  }
}

describe.skipIf(() => !!import.meta.env.PROD)("inspect utilities", () => {
  test("an installed DisplayStruct is used by util.inspect", async () => {
    const util = await import("node:util");

    expect(util.inspect(new Person("Tom Dale", "New York"))).toBe(
      `Person ${util.inspect({ name: "Tom Dale", location: "New York" })}`
    );

    expect(
      util.inspect(new Person("Tom Dale", "New York", "starbeam-core"))
    ).toBe(
      `Person [starbeam-core] ${util.inspect({
        name: "Tom Dale",
        location: "New York",
      })}`
    );
  });
});
