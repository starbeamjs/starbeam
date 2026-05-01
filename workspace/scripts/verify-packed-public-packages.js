import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { globby, globbySync } from "globby";

const currentDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(currentDir, "../..");
const rootTypesDir = resolve(root, "dist/types");

const packageJsonPaths = await globby("**/package.json", {
  cwd: root,
  absolute: true,
  ignore: [
    "**/.git/**",
    "**/.yalc/**",
    "**/coverage/**",
    "**/dist/**",
    "**/node_modules/**",
  ],
});

const packages = await Promise.all(
  packageJsonPaths.map(async (path) => {
    let manifest;

    try {
      manifest = JSON.parse(await readFile(path, "utf8"));
    } catch (error) {
      throw new Error(
        `Failed to read or parse package.json at ${relative(root, path)}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { cause: error },
      );
    }

    return {
      dir: dirname(path),
      manifest,
      path,
    };
  }),
);

const workspacePackages = packages.filter(({ manifest }) => manifest.name);
const publicPackages = workspacePackages.filter(
  ({ manifest }) => manifest.publishConfig && manifest.private !== true,
);
const privatePackageNames = new Set(
  workspacePackages
    .filter(({ manifest }) => manifest.private === true)
    .map(({ manifest }) => manifest.name),
);

let errors = [];

for (let pkg of publicPackages) {
  validateManifest(pkg);
  validateArtifacts(pkg);
}

if (errors.length > 0) {
  for (let error of errors) {
    console.error(`${error.package}: ${error.message}`);

    if (error.file) {
      console.error(`  file: ${relative(root, error.file)}`);
    }
  }

  throw new Error("Public package artifact verification failed");
}

console.info(`Verified ${publicPackages.length} publishable packages.`);

function validateManifest(pkg) {
  let { manifest } = pkg;

  for (let field of [
    "dependencies",
    "peerDependencies",
    "optionalDependencies",
  ]) {
    let deps = manifest[field] ?? {};

    for (let dep of Object.keys(deps)) {
      if (privatePackageNames.has(dep)) {
        fail(
          pkg,
          `published ${field} references private package ${dep}`,
          pkg.path,
        );
      }
    }
  }

  if (!manifest.publishConfig?.exports) {
    fail(pkg, "publishConfig.exports is missing", pkg.path);
  }

  if (hasRuntimeEntrypoint(pkg) && manifest.type !== "module") {
    fail(pkg, "runtime package is missing type: module", pkg.path);
  }

  if (referencesCjs(manifest.publishConfig)) {
    fail(pkg, "publishConfig references a CJS artifact", pkg.path);
  }

  if (isTypeOnlyPackage(pkg) && hasRuntimeEntrypoint(pkg)) {
    fail(pkg, "type-only package declares a runtime artifact", pkg.path);
  }

  if (hasRuntimeEntrypoint(pkg) && !manifest.publishConfig?.main) {
    fail(pkg, "publishConfig.main is missing", pkg.path);
  }

  if (!manifest.publishConfig?.types) {
    fail(pkg, "publishConfig.types is missing", pkg.path);
  }
}

function validateArtifacts(pkg) {
  let artifacts = new Map();
  let { publishConfig } = pkg.manifest;
  let scannedFiles = new Set();

  addPublishedArtifact(artifacts, pkg, publishConfig?.main, "js");
  addPublishedArtifact(artifacts, pkg, publishConfig?.types, "types");
  collectExportArtifacts(artifacts, pkg, publishConfig?.exports);

  for (let artifact of artifacts.values()) {
    let file = resolvePublishedArtifact(pkg, artifact);

    if (!file) {
      continue;
    }

    scanFileForPrivateReferences(pkg, file, scannedFiles);
  }

  for (let file of findPackageDistJavaScript(pkg)) {
    scanFileForPrivateReferences(pkg, file, scannedFiles);
  }

  for (let file of findRootDeclarations(pkg)) {
    scanFileForPrivateReferences(pkg, file, scannedFiles);
    validateDeclarationMap(pkg, file);
  }
}

function resolvePublishedArtifact(pkg, artifact) {
  if (existsSync(artifact.file)) {
    return artifact.file;
  }

  if (artifact.kind === "types") {
    let rootDeclaration = rootDeclarationForPackageArtifact(pkg, artifact.file);

    if (rootDeclaration && existsSync(rootDeclaration)) {
      return rootDeclaration;
    }

    fail(
      pkg,
      `declared types artifact is missing: ${artifact.specifier}`,
      artifact.file,
    );
  } else if (artifact.kind === "js") {
    fail(
      pkg,
      `declared JS artifact is missing: ${artifact.specifier}`,
      artifact.file,
    );
  }

  return undefined;
}

function scanFileForPrivateReferences(pkg, file, scannedFiles) {
  if (scannedFiles.has(file) || !existsSync(file)) {
    return;
  }

  scannedFiles.add(file);

  let content = readFileSync(file, "utf8");

  for (let name of privatePackageNames) {
    if (referencesPackage(content, name)) {
      fail(pkg, `published artifact references private package ${name}`, file);
    }
  }
}

function collectExportArtifacts(artifacts, pkg, value, kindHint) {
  if (typeof value === "string") {
    addPublishedArtifact(artifacts, pkg, value, kindHint);
  } else if (Array.isArray(value)) {
    for (let item of value) {
      collectExportArtifacts(artifacts, pkg, item, kindHint);
    }
  } else if (value && typeof value === "object") {
    for (let [key, item] of Object.entries(value)) {
      collectExportArtifacts(
        artifacts,
        pkg,
        item,
        key === "types" ? "types" : kindHint,
      );
    }
  }
}

function addPublishedArtifact(artifacts, pkg, specifier, kindHint) {
  if (isPackageRelativePath(specifier)) {
    let file = resolve(pkg.dir, specifier);
    let kind = kindHint ?? artifactKind(specifier);

    artifacts.set(`${kind}:${file}`, { file, kind, specifier });
  }
}

function artifactKind(file) {
  if (isDeclarationFile(file)) {
    return "types";
  } else if (/\.(?:c|m)?js$/.test(file)) {
    return "js";
  } else {
    return "other";
  }
}

function rootDeclarationForPackageArtifact(pkg, file) {
  let packageRelativePath = posixPath(relative(pkg.dir, file));

  if (!packageRelativePath.startsWith("dist/")) {
    return undefined;
  }

  return resolve(
    rootTypesDir,
    relative(root, pkg.dir),
    packageRelativePath.slice("dist/".length),
  );
}

function findPackageDistJavaScript(pkg) {
  return globbySync("dist/**/*.js", {
    cwd: pkg.dir,
    absolute: true,
    onlyFiles: true,
  });
}

function findRootDeclarations(pkg) {
  let declarationsRoot = resolve(rootTypesDir, relative(root, pkg.dir));

  if (!existsSync(declarationsRoot)) {
    return [];
  }

  return globbySync(["**/*.d.ts", "**/*.d.mts", "**/*.d.cts"], {
    cwd: declarationsRoot,
    absolute: true,
    onlyFiles: true,
  }).filter((file) => shouldScanRootDeclaration(declarationsRoot, file));
}

function shouldScanRootDeclaration(declarationsRoot, file) {
  let relativePath = relative(declarationsRoot, file);
  let segments = relativePath.split(/[\\/]/u);
  let fileName = basename(file);
  let ignoredSegments = new Set([
    "__tests__",
    "bench",
    "benches",
    "spec",
    "specs",
    "test",
    "tests",
  ]);

  if (segments.slice(0, -1).some((segment) => ignoredSegments.has(segment))) {
    return false;
  }

  return !(
    fileName.startsWith("_test") ||
    fileName.startsWith("rollup.config.d.") ||
    /\.(?:spec|test)\.d\.[cm]?ts$/u.test(fileName)
  );
}

function validateDeclarationMap(pkg, declarationFile) {
  let mapFile = `${declarationFile}.map`;

  if (!existsSync(mapFile)) {
    return;
  }

  let map;

  try {
    map = JSON.parse(readFileSync(mapFile, "utf8"));
  } catch (error) {
    fail(
      pkg,
      `declaration map could not be parsed: ${
        error instanceof Error ? error.message : String(error)
      }`,
      mapFile,
    );

    return;
  }

  let sourceRoot = typeof map.sourceRoot === "string" ? map.sourceRoot : "";

  for (let source of map.sources ?? []) {
    if (typeof source !== "string" || URL.canParse(source)) {
      continue;
    }

    let sourcePath = resolve(dirname(mapFile), sourceRoot, source);

    if (!existsSync(sourcePath)) {
      fail(pkg, `declaration map references missing source ${source}`, mapFile);
    }
  }
}

function hasRuntimeEntrypoint(pkg) {
  let { publishConfig } = pkg.manifest;

  if (publishConfig?.main) {
    return true;
  }

  return hasRuntimeExport(publishConfig?.exports);
}

function isTypeOnlyPackage(pkg) {
  return pkg.manifest.starbeam?.type === "library:interfaces";
}

function hasRuntimeExport(value) {
  if (typeof value === "string") {
    return /\.(?:c|m)?js$/.test(value);
  } else if (Array.isArray(value)) {
    return value.some(hasRuntimeExport);
  } else if (value && typeof value === "object") {
    return Object.entries(value).some(
      ([key, item]) => key !== "types" && hasRuntimeExport(item),
    );
  } else {
    return false;
  }
}

function referencesPackage(content, name) {
  return new RegExp(`["']${escapeRegExp(name)}(?:/[^"']*)?["']`, "u").test(
    content,
  );
}

function referencesCjs(value) {
  return JSON.stringify(value).includes(".cjs");
}

function isPackageRelativePath(value) {
  return (
    typeof value === "string" &&
    !value.startsWith("/") &&
    !value.startsWith("node:") &&
    !URL.canParse(value)
  );
}

function isDeclarationFile(file) {
  return /\.d\.[cm]?ts$/u.test(file);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function posixPath(path) {
  return path.replace(/\\/gu, "/");
}

function fail(pkg, message, file) {
  errors.push({ package: pkg.manifest.name, message, file });
}
