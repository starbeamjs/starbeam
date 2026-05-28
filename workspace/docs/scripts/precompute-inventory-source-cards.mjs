import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

import { createAstroRenderer } from "astro-expressive-code";
import { toHtml } from "astro-expressive-code/hast";

import ecConfig from "../ec.config.mjs";

const GENERATOR_VERSION = 3;
const DOCS_ROOT = new URL("../", import.meta.url);
const REPO_ROOT = new URL("../../", DOCS_ROOT);
const OUTPUT_URL = new URL(
  "src/generated/inventory-source-cards.json",
  DOCS_ROOT,
);

const SOURCES = {
  model: {
    sourcePath: "demos/table-core/src/table.ts",
    language: "ts",
  },
  preact: {
    sourcePath: "demos/table-preact/src/App.tsx",
    language: "tsx",
  },
  react: {
    sourcePath: "demos/table-react/src/App.tsx",
    language: "tsx",
  },
};

const sourceEntries = await Promise.all(
  Object.entries(SOURCES).map(async ([name, source]) => {
    const code = await readFile(new URL(source.sourcePath, REPO_ROOT), "utf8");

    return [
      name,
      {
        ...source,
        code,
        sourceHash: sha256(code),
      },
    ];
  }),
);

const packageJson = JSON.parse(
  await readFile(new URL("package.json", DOCS_ROOT), "utf8"),
);
const ecConfigSource = await readFile(
  new URL("ec.config.mjs", DOCS_ROOT),
  "utf8",
);

const cacheInput = {
  generatorVersion: GENERATOR_VERSION,
  ecConfigHash: sha256(ecConfigSource),
  expressiveCodeVersion: packageJson.dependencies["astro-expressive-code"],
  twoSlashVersion: packageJson.dependencies["expressive-code-twoslash"],
  sources: Object.fromEntries(
    sourceEntries.map(([name, source]) => [
      name,
      {
        language: source.language,
        sourceHash: source.sourceHash,
        sourcePath: source.sourcePath,
      },
    ]),
  ),
};
const cacheKey = sha256(JSON.stringify(cacheInput));

const existingArtifact = await readExistingArtifact();

if (existingArtifact?.cacheKey === cacheKey) {
  console.log(
    JSON.stringify({
      status: "cached",
      cacheKey,
      cards: Object.keys(existingArtifact.cards),
    }),
  );
  process.exit(0);
}

const started = performance.now();
const renderer = await createAstroRenderer({
  ecConfig: {
    ...ecConfig,
    emitExternalStylesheet: false,
  },
  astroConfig: {
    base: "/",
    root: DOCS_ROOT,
    srcDir: new URL("src/", DOCS_ROOT),
    build: { assets: "_astro" },
  },
});

const cards = {};
const timings = {};

for (const [name, source] of sourceEntries) {
  const fileStarted = performance.now();
  const { renderedGroupAst } = await renderer.ec.render({
    code: source.code,
    language: source.language,
    meta: "twoslash",
    parentDocument: {
      sourceFilePath: `/demos/inventory-table/${name}`,
      positionInDocument: { groupIndex: 0 },
    },
    props: { frame: "none" },
  });
  const html = toHtml(renderedGroupAst);

  if (!html.includes("expressive-code") || !html.includes("twoslash-hover")) {
    throw new Error(`Expected Expressive Code and Twoslash markup for ${name}`);
  }

  if (html.includes("<link")) {
    throw new Error(`Expected inline Expressive Code styles for ${name}`);
  }

  cards[name] = {
    html,
    language: source.language,
    sourceHash: source.sourceHash,
    sourcePath: source.sourcePath,
  };
  timings[name] = Math.round(performance.now() - fileStarted);
}

await mkdir(new URL(".", OUTPUT_URL), { recursive: true });
await writeFile(
  OUTPUT_URL,
  `${JSON.stringify(
    {
      cacheKey,
      cards,
      version: GENERATOR_VERSION,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(
  JSON.stringify({
    status: "generated",
    cacheKey,
    timings,
    totalMs: Math.round(performance.now() - started),
  }),
);

async function readExistingArtifact() {
  try {
    return JSON.parse(await readFile(OUTPUT_URL, "utf8"));
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return undefined;
    }

    throw error;
  }
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
