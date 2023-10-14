import { env } from "./env.js";
import { Cell } from '@starbeam/universal';
import { El, Text, Fragment } from "@starbeamx/vanilla";

export const oneK = () => {
  let renderer;

  return {
    setup: () => {
      const fragments = [];

      for (let i = 0; i < 1000; i++) {
        const a = Cell("Hello World");
        const b = Cell(" - ");
        const c = Cell("Goodbye World");

        const title = El.Attr("title", a);

        const el = El({
          tag: "div",
          attributes: [title],
          body: [Text(a), Text(b), Text(c)],
        });
        fragments.push(el);
      }

      let root = Fragment(fragments);

      renderer = root;
    },
    render: () => {
      const { body, owner } = env();
      renderer(body.cursor).create({ owner });
    },
  };
};
