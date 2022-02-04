import { HtmlBuffer } from "starbeam";
import { test, expect, toBe } from "../support/define.js";

test("ContentBuffer text", () => {
  let content = HtmlBuffer.create().text("hello");

  expect(content.serialize(), toBe("hello"));
});

test("ContentBuilder comment", () => {
  let content = HtmlBuffer.create().comment("hello");

  expect(content.serialize(), toBe("<!--hello-->"));
});

test("ContentBuilder simple element", () => {
  let content = HtmlBuffer.create().element("div", (div) =>
    div.attr("class", "name").body().text("Chirag")
  );

  expect(content.serialize(), toBe(`<div class="name">Chirag</div>`));
});
