import { Expects, test } from "../support/index.js";
import { Dynamism } from "../support/expect/expect.js";
import { Cell, Reactive } from "starbeam";
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