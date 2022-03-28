// @ts-check

export const THEME_CSS = oneline`
* {
  box-sizing: border-box;
}
foreignObject {
  display: block;
}
span {
  all: revert;
  font-display: block;
  text-size-adjust: 100%;
  font-size: 1rem;
  line-height: 1.4;
  box-sizing: border-box;
  display: inline-block;
  white-space: nowrap;
}
b {
  font-weight: normal;
  color: #666;
}
span.nodeLabel {
  width: max-content;
  max-width: 60ch;
  white-space: normal;
  overflow-wrap: break-word;
}
.lifecycle span span.nodeLabel,
span.edgeLabel,
g.node.note foreignObject div span.nodeLabel {
  line-height: 1.35;
  padding: 0;
  font-family: -apple-system,BlinkMacSystemFont,\"Segoe UI\",Helvetica,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\";
}
g.node.lifecycle span.nodeLabel,
span.nodeLabel,
b {
  font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas,
    Liberation Mono, monospace;
}
g.node.lifecycle span.nodeLabel {
  font-weight: bold;
}
.lifecycle span.nodeLabel {
  color: #a00;
}
.lifecycle span.nodeLabel span {
  font-size: 80%;
  font-weight: bold;
  padding-inline: 0.5rem;
  padding-block-end: 0.2rem;
  border-radius: 0.5ch;
  background-color: #eb9;
  color: #975;
}
span.edgeLabel:not(:empty) {
  padding: 0.5rem;
  color: #999;
  background-color: #eee;
}
`;

/**
 * @param {readonly string[]} raw
 * @param  {...unknown} values
 * @returns {string}
 */
export function oneline(raw, ...values) {
  let out = raw[0];

  for (const [value, i] of /** @type {Iterable<[unknown, number]>} */ (
    Object.entries(values)
  )) {
    out += value + raw[i + 1];
  }

  return out
    .split("\n")
    .map((item) => item.trim())
    .join(" ");
}
