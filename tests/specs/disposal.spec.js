import { lifetime, Finalizer } from "starbeam";
import { expect, test, toBe } from "../support/index.js";
test("universe.on.destroy", () => {
    let tom = { name: "Tom" };
    let yehuda = { name: "Yehuda" };
    let destroyed = 0;
    let destroyedToken = 0;
    lifetime.on.finalize(tom, () => destroyed++);
    lifetime.on.finalize(yehuda, Finalizer.create((token) => {
        destroyedToken += token;
    }, "increment token", 5));
    lifetime.link(tom, yehuda);
    lifetime.finalize(tom);
    expect(destroyed, toBe(1));
    expect(destroyedToken, toBe(5));
});
//# sourceMappingURL=disposal.spec.js.map