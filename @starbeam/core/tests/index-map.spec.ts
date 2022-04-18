import { Formula } from "@starbeam/reactive";
import { IndexMap } from "../index.js";

test("index maps are reactive", () => {
  const index = IndexMap.create<string, string>();

  const frameworkCore = Formula(() => [
    ...(index.findByValue("framework-core") || []),
  ]);

  // assert frameworkCore is empty
  expect(frameworkCore.current).toEqual([]);

  index.add("wycats", "framework-core");

  // assert frameworkCore has wycats
  expect(frameworkCore.current).toEqual(["wycats"]);

  // add tomdale to framework-core
  index.add("tomdale", "framework-core");

  // assert frameworkCore has wycats and tomdale
  expect(frameworkCore.current).toEqual(["wycats", "tomdale"]);

  index.add("melanie", "framework-core");

  // assert frameworkCore has wycats, tomdale and melanie
  expect(frameworkCore.current).toEqual(["wycats", "tomdale", "melanie"]);

  index.delete("tomdale", "framework-core");

  // assert frameworkCore has wycats and melanie
  expect(frameworkCore.current).toEqual(["wycats", "melanie"]);
});

export {};
