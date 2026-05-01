import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(currentDir, "../..");

const ARTIFACTS = new Map(
  [
    ["@starbeam/core-utils", "packages/universal/core-utils/dist/index"],
    ["@starbeam/shared", "packages/universal/shared/dist/index"],
    ["@starbeam/tags", "packages/universal/tags/dist/index"],
    ["@starbeam/reactive", "packages/universal/reactive/dist/index"],
    ["@starbeam/runtime", "packages/universal/runtime/dist/index"],
    ["@starbeam/resource", "packages/universal/resource/dist/index"],
    ["@starbeam/debug", "packages/universal/debug/dist/index"],
    ["@starbeam/universal", "packages/universal/universal/dist/index"],
  ].map(([specifier, path]) => [specifier, resolve(root, path)]),
);

const PNPM_RUNTIME_DEPENDENCIES = new Map([
  [
    "inspect-utils",
    "../.pnpm/node_modules/inspect-utils/dist/index.development.js",
  ],
  ["stacktracey", "../.pnpm/node_modules/stacktracey/stacktracey.js"],
]);

const PUBLIC_UNIVERSAL_ARTIFACTS = [
  "packages/universal/universal/dist/index.development.js",
  "packages/universal/universal/dist/index.js",
];

await verifyDevelopmentArtifacts();
await verifyProductionArtifacts();

console.info(
  "Verified debug bootstrap in development and production artifacts.",
);

async function verifyDevelopmentArtifacts() {
  for (const mode of ["development"]) {
    const universal = await importDevelopmentArtifact(
      "@starbeam/universal",
      mode,
    );

    assertDebugBootstrapped(
      universal.DEBUG,
      `${mode} @starbeam/universal artifact`,
    );
  }

  for (const path of PUBLIC_UNIVERSAL_ARTIFACTS) {
    const content = await readFile(resolve(root, path), "utf8");

    assertIncludes(
      content,
      "setupDebug()",
      `${path} must retain the debug bootstrap call`,
    );
  }
}

async function verifyProductionArtifacts() {
  const universal = await importProductionArtifact("@starbeam/universal");

  assertDebugNotBootstrapped(
    universal.DEBUG,
    "production @starbeam/universal artifact",
  );

  const productionArtifacts = [
    "packages/universal/universal/dist/index.production.js",
    "packages/universal/universal/dist/index.production.js.map",
  ];

  for (const path of productionArtifacts) {
    const content = await readFile(resolve(root, path), "utf8");

    for (const forbidden of [
      "@starbeam/debug",
      "@starbeam/verify",
      "stacktracey",
    ]) {
      assertExcludes(
        content,
        forbidden,
        `${path} must not include ${forbidden}`,
      );
    }
  }
}

async function importDevelopmentArtifact(specifier, mode) {
  return importRewrittenArtifacts(specifier, mode);
}

async function importProductionArtifact(specifier) {
  return importRewrittenArtifacts(specifier, "production");
}

async function importRewrittenArtifacts(specifier, mode) {
  const workspace = await mkdtemp(
    join(root, "node_modules/.starbeam-debug-bootstrap."),
  );

  try {
    const rewritten = new Map();

    for (const [artifactSpecifier, artifact] of ARTIFACTS) {
      const source = artifactPath(artifact, mode);
      const target = join(workspace, artifactFile(artifactSpecifier));

      rewritten.set(artifactSpecifier, target);
      await writeFile(target, await rewriteImports(source, rewritten));
    }

    return await import(pathToFileURL(rewritten.get(specifier)).href);
  } finally {
    await rm(workspace, { force: true, recursive: true });
  }
}

async function rewriteImports(source, rewritten) {
  let content = await readFile(source, "utf8");

  for (const [specifier, target] of rewritten) {
    const replacement = `./${basename(target)}`;

    content = content
      .replaceAll(`from "${specifier}"`, `from "${replacement}"`)
      .replaceAll(`from '${specifier}'`, `from '${replacement}'`)
      .replaceAll(`import "${specifier}"`, `import "${replacement}"`)
      .replaceAll(`import '${specifier}'`, `import '${replacement}'`);
  }

  for (const [specifier, replacement] of PNPM_RUNTIME_DEPENDENCIES) {
    content = content
      .replaceAll(`from "${specifier}"`, `from "${replacement}"`)
      .replaceAll(`from '${specifier}'`, `from '${replacement}'`)
      .replaceAll(`import "${specifier}"`, `import "${replacement}"`)
      .replaceAll(`import '${specifier}'`, `import '${replacement}'`);
  }

  return content;
}

function artifactPath(base, mode) {
  const suffix = mode === "default" ? "" : `.${mode}`;

  return `${base}${suffix}.js`;
}

function artifactFile(specifier) {
  return `${specifier.slice("@starbeam/".length)}.js`;
}

function assertDebugBootstrapped(debug, label) {
  assert(
    debug && typeof debug.Desc === "function",
    `${label} should export bootstrapped DEBUG.Desc`,
  );

  const desc = debug.Desc("cell");

  assert(desc !== undefined, `${label} DEBUG.Desc should create a description`);
  assert(
    desc.api?.name === "assertDebugBootstrapped",
    `${label} DEBUG.Desc should infer the caller api, got ${JSON.stringify(
      desc.api,
    )}`,
  );
  assert(
    typeof debug.callerStack === "function" &&
      debug.callerStack() !== undefined,
    `${label} DEBUG.callerStack should produce a call stack`,
  );
}

function assertDebugNotBootstrapped(debug, label) {
  assert(debug === undefined, `${label} should not bootstrap DEBUG`);
}

function assertIncludes(content, needle, message) {
  assert(content.includes(needle), message);
}

function assertExcludes(content, needle, message) {
  assert(!content.includes(needle), message);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
