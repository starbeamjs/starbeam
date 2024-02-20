import { consume, start } from "@starbeam/shared";
import { describe, expect, test } from "@starbeam-workspace/test-utils";

describe("the autotracking stack", () => {
  test("consuming a lifetime", () => {
    const done = start();
    const obj = {};
    consume(obj);
    const items = done();
    expect([...items]).toEqual([obj]);
  });

  test("consuming the same lifetime twice", () => {
    const done = start();
    const obj = {};
    consume(obj);
    consume(obj);
    const items = done();
    expect([...items]).toStrictEqual([obj]);
  });

  test("consuming multiple lifetimes, multiple times", () => {
    const done = start();
    const obj1 = {};
    const obj2 = {};
    const obj3 = {};

    consume(obj1);
    consume(obj2);
    consume(obj1);
    consume(obj2);
    consume(obj2);
    consume(obj1);
    consume(obj3);

    const items = done();
    expect([...items]).toStrictEqual([obj1, obj2, obj3]);
  });
});
