import { lifetime, Finalizer } from "starbeam";
import { expect, test, toBe } from "../support/index.js";

test("universe.on.destroy", () => {
  let tom = { name: "Tom" };
  let yehuda = { name: "Yehuda" };

  let destroyed = 0;
  let destroyedToken = 0;

  lifetime.on.destroy(tom, () => destroyed++);
  lifetime.on.destroy(
    yehuda,
    Finalizer.create(
      (token: number) => {
        destroyedToken += token;
      },
      "increment token",
      5
    )
  );

  lifetime.link(tom, yehuda);
  lifetime.finalize(tom);

  expect(destroyed, toBe(1));
  expect(destroyedToken, toBe(5));
});
