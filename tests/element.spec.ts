import { Expects, test } from "./support";

test("a simple element containing a text node (dynamic) ", ({
  timeline,
  dom,
  test,
}) => {
  let name = timeline.reactive("Chirag");

  let element = test.buildElement(
    timeline.static("div"),
    (b) => {
      b.append(dom.text(name));
    },
    Expects.dynamic
  );

  let result = test.render(element, Expects.dynamic);
  expect(result.node.tagName).toBe("DIV");
  expect(result.node.firstChild).toMatchObject({
    nodeType: 3,
    nodeValue: "Chirag",
  });

  name.update("Chi");
  timeline.poll(result);

  expect(result.node.tagName).toBe("DIV");
  expect(result.node.firstChild).toMatchObject({
    nodeType: 3,
    nodeValue: "Chi",
  });
});

test("a simple element containing a text node (static) ", ({
  timeline,
  test,
}) => {
  let name = timeline.reactive("Chirag");

  let text = test.buildText(name, Expects.dynamic);

  let result = test.render(text, Expects.dynamic);
  expect(result.node.nodeValue).toBe("Chirag");

  name.update("Chi");
  timeline.poll(result);

  expect(result.node.nodeValue).toBe("Chi");
});
