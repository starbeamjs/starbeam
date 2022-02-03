import { Finalizer } from "starbeam";
import { expect, test, toBe } from "../support";

test("universe.on.destroy", ({ universe }) => {
  let tom = { name: "Tom" };
  let yehuda = { name: "Yehuda" };

  let destroyed = 0;
  let destroyedToken = 0;

  universe.on.destroy(tom, () => destroyed++);
  universe.on.destroy(
    yehuda,
    Finalizer.create(
      (token: number) => {
        destroyedToken += token;
      },
      "increment token",
      5
    )
  );
  universe.lifetime.link(tom, yehuda);

  universe.finalize(tom);

  expect(destroyed, toBe(1));
  expect(destroyedToken, toBe(5));
});
