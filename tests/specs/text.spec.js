import { Cell, Reactive } from "@starbeam/core";
import { Dynamism } from "../support/expect/expect.js";
import { Expects, test } from "../support/index.js";
test("dynamic text", ({ test }) => {
    let hello = Cell("hello");
    let text = test.buildText(hello, Dynamism.dynamic);
    test
        .render(text, Expects.dynamic.html("hello"))
        .update([hello, "goodbye"], Expects.html("goodbye"));
});
test("static text", ({ test }) => {
    let hello = Reactive.from("hello");
    let text = test.buildText(hello, Dynamism.constant);
    test.render(text, Expects.constant.html("hello"));
});
//# sourceMappingURL=text.spec.js.map