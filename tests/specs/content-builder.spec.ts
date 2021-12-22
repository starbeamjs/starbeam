import { HtmlBuilder } from "../support/starbeam";
import { test, expect, toBe } from "../support/define";

test("ContentBuilder text", () => {
  let content = HtmlBuilder.create().text("hello");

  expect(content.serialize(), toBe("hello"));
});

test("ContentBuilder comment", () => {
  let content = HtmlBuilder.create().comment("hello");

  expect(content.serialize(), toBe("<!--hello-->"));
});

test("ContentBuilder simple element", () => {
  let content = HtmlBuilder.create().element("div", (div) =>
    div.attr("class", "name").body().text("Chirag")
  );

  expect(content.serialize(), toBe(`<div class="name">Chirag</div>`));
});
