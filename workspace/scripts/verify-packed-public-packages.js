import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { globby } from "globby";

const currentDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(currentDir, "../..");

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
    let manifest = JSON.parse(await readFile(path, "utf8"));

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

  if (hasRuntimeEntrypoint(pkg) && !manifest.publishConfig?.main) {
    fail(pkg, "publishConfig.main is missing", pkg.path);
  }

  if (!manifest.publishConfig?.types) {
    fail(pkg, "publishConfig.types is missing", pkg.path);
  }
}

function validateArtifacts(pkg) {
  let files = new Set();
  let { publishConfig } = pkg.manifest;

  addPublishedFile(files, pkg, publishConfig?.main);
  addPublishedFile(files, pkg, publishConfig?.types);
  collectExportFiles(files, pkg, publishConfig?.exports);

  for (let file of files) {
    if (!existsSync(file)) {
      // Several packages currently publish types from the root tsc output and
      // type-only packages have no built JS. This verifier still checks every
      // artifact that exists today, and later surface-reduction PRs can tighten
      // missing-artifact checks package by package.
      continue;
    }

    let content = readFileSync(file, "utf8");

    for (let name of privatePackageNames) {
      if (referencesPackage(content, name)) {
        fail(
          pkg,
          `published artifact references private package ${name}`,
          file,
        );
      }
    }
  }
}

function collectExportFiles(files, pkg, value) {
  if (typeof value === "string") {
    addPublishedFile(files, pkg, value);
  } else if (Array.isArray(value)) {
    for (let item of value) {
      collectExportFiles(files, pkg, item);
    }
  } else if (value && typeof value === "object") {
    for (let item of Object.values(value)) {
      collectExportFiles(files, pkg, item);
    }
  }
}

function addPublishedFile(files, pkg, file) {
  if (typeof file === "string" && file.startsWith("./")) {
    files.add(resolve(pkg.dir, file));
  }
}

function hasRuntimeEntrypoint(pkg) {
  let { publishConfig } = pkg.manifest;

  if (publishConfig?.main) {
    return true;
  }

  return hasRuntimeExport(publishConfig?.exports);
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
  return content.includes(`"${name}"`) || content.includes(`'${name}'`);
}

function referencesCjs(value) {
  return JSON.stringify(value).includes(".cjs");
}

function fail(pkg, message, file) {
  errors.push({ package: pkg.manifest.name, message, file });
}
