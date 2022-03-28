// @ts-check

/// <reference path="./jsx.d.ts" />

export function Mermaid({ children }) {
  const body = `${INIT}\n${trimString(children.join(""))}`;

  return jsx(fenced("mermaid", body));
}

/**
 * @param {object} options
 * @param {string[]} options.children
 * @param {"TB" | "BT" | "LR" | "RL"} options.direction
 * @returns
 */
export function Flowchart({ children, direction = "TB" }) {
  return Mermaid({
    children: [
      `flowchart ${direction}\n`,
      `${FLOWCHART_CLASSES_STRING}\n`,
      ...children,
    ],
  });
}

/**
 * @param {object} options
 * @param {string} options.name
 * @param {"vertical" | "horizontal"} options.direction
 * @param {string} options.description
 * @param {string[]} options.children
 * @returns
 */

export function Graph({ name, direction = "vertical", description, children }) {
  const headerDir = direction === "vertical" ? "LR" : "TB";
  const bodyDir = direction === "vertical" ? "TB" : "LR";

  console.log(name);

  return trimString(`
    style ${name}Body fill:#0000,stroke:#0000

    subgraph ${name} [ ]
      direction ${headerDir}
      subgraph ${name}Body [ ]
        direction ${bodyDir}
        ${trimString(children.join(""))}
        ${name}Description(${description}):::note
      end
    end
  `);
}

/**
 *
 * @param {string} value
 * @returns {JSX.Element}
 */
function jsx(value) {
  return /** @type {any} */ (value);
}

const FLOWCHART_CLASSES = {
  start: {
    fill: "#9f9",
    color: "#060",
  },
  finish: {
    fill: "#f99",
    color: "#600",
  },
  note: {
    fill: "#eee",
    stroke: "#aaa",
    color: "#999",
    "text-align": "left",
  },
  graphLabel: {
    fill: "#ccf9",
    stroke: "#0099",
    color: "#009",
  },
};

const FLOWCHART_CLASSES_STRING = Object.entries(FLOWCHART_CLASSES)
  .map(([name, css]) => {
    const rules = Object.entries(css)
      .map(([property, value]) => `${property}:${value}`)
      .join(",");
    return `classDef ${name} ${rules}`;
  })
  .join("\n");

export const THEME_CSS = oneline`
* {
  box-sizing: border-box;
}
foreignObject {
  display: block;
}
g.label span {
  text-shadow: none;
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
i {
  opacity: 70%;
}
em {
  display: grid;
  opacity: 70%;
  text-align: left;
  padding: 1rem;
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

/**
 * @param {readonly string[]} raw
 * @param  {...unknown} values
 * @returns {string}
 */
export function trim(raw, ...values) {
  let out = raw[0];

  for (const [value, i] of /** @type {Iterable<[unknown, number]>} */ (
    Object.entries(values)
  )) {
    out += value + raw[i + 1];
  }

  return trimString(out);
}

function trimString(string) {
  const lines = string.split("\n");

  if (!isPresent(lines[0])) {
    lines.shift();
  }

  if (!isPresent(lines[lines.length - 1])) {
    lines.pop();
  }

  const leading = Math.min(...lines.filter(isPresent).map(leadingSpace));

  return lines.map((item) => item.slice(leading)).join("\n");
}

function isPresent(line) {
  return line.trim() !== "";
}

function leadingSpace(line) {
  return line.length - line.trimStart().length;
}

const INIT_OPTIONS = {
  theme: "neutral",
  themeVariables: { fontSize: "1rem" },
  flowchart: { curve: "linear" },
  themeCSS: THEME_CSS,
};

const INIT = `%%{init: ${JSON.stringify(INIT_OPTIONS)} }%%`;

function fenced(lang, body) {
  return "```" + lang + "\n" + body + "\n" + "```";
}

export function LiveReload() {
  return `<script>document.write('<script src="http://' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1"></' + 'script>')</script>`;
}
