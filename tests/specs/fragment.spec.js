import { Expects, test } from "../support/index.js";
import { Dynamism } from "../support/expect/expect.js";
import { Cell, Reactive } from "starbeam";
test("a fragment containing a text node (dynamic) ", ({ test }) => {
    let name = Cell("Chirag");
    let fragment = test.buildFragment([test.buildText(name, Dynamism.dynamic)], Expects.dynamic);
    test
        .render(fragment, Expects.dynamic.html("Chirag"))
        .update([name, "Chi"], Expects.dynamic.html("Chi"));
});
test("a fragment containing a text node (static) ", ({ test }) => {
    const NAME = "Chirag";
    let name = Reactive.from(NAME);
    let element = test.buildFragment([test.buildText(name, Dynamism.constant)], Expects.constant);
    test.render(element, Expects.constant.html("Chirag"));
});
test("a fragment containing a text node (dynamic => static) ", ({ test }) => {
    let name = Cell("Chirag");
    let fragment = test.buildFragment([test.buildText(name, Dynamism.dynamic)], Expects.dynamic);
    test
        .render(fragment, Expects.dynamic.html("Chirag"))
        .update([name, "Chi"], Expects.dynamic.html("Chi"))
        .update(() => name.freeze(), Expects.constant.html("Chi"));
});
test("(smoke test) a fragment with a few children", ({ dom, test }) => {
    const FIRST_NAME = "Chirag";
    const LAST_NAME = "Patel";
    const SHORT_NAME = "Chi";
    let firstName = Cell(FIRST_NAME);
    let lastName = Cell(LAST_NAME);
    let fragment = test.buildFragment([
        dom.text(firstName),
        " ",
        dom.text(lastName),
        " ",
        test.buildElement("span", { children: ["(", "name", ")"] }, Expects.constant),
        " -- ",
        "Over and Out",
    ], Expects.dynamic);
    test
        .render(fragment, Expects.dynamic.html(`${FIRST_NAME} ${LAST_NAME} <span>(name)</span> -- Over and Out`))
        .update([firstName, SHORT_NAME], Expects.html(`${SHORT_NAME} ${LAST_NAME} <span>(name)</span> -- Over and Out`));
});
//# sourceMappingURL=fragment.spec.js.map