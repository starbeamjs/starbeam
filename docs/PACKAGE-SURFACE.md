# Package Surface Heuristics

This document records how we decide whether a workspace package should be part
of Starbeam's public npm surface.

The default is not "publish it because it exists." A public package needs a
positive reason to be installed directly.

## Public package criteria

A package should stay public only if it satisfies at least one of these
criteria.

### 1. Distinct audience

The package serves a supported audience that is distinct from ordinary
Starbeam users.

Examples:

- framework adapters such as `@starbeam/react`, `@starbeam/preact`, and
  `@starbeam/vue`
- framework-author or runtime-author APIs, if we decide that audience is
  supported for the release

### 2. Complete story

The package represents one coherent piece of Starbeam's model, even if its
current implementation is small.

The question is not "how much code is in the package?" The question is whether
the package maps to something we want users or implementors to understand as a
separate concept.

Examples:

- element modifiers / refs / directives as the DOM-attachment part of
  framework reactivity
- resources as the lifecycle-aware composition primitive

### 3. Reusable infrastructure

The package provides infrastructure that is useful outside Starbeam and worth
explaining as a package in its own right.

This is not enough by itself. We should be able to say why publishing it serves
Starbeam's goals.

Examples of plausible candidates:

- `@starbeam/use-strict-lifecycle`
- Preact private-shape utilities, if we later decide to document and support
  them for other Preact tooling authors

### 4. Architectural necessity

The architecture depends on the package having a separate npm identity.

Example:

- `@starbeam/shared`, which lets multiple Starbeam copies interoperate,
  including across major versions

### 5. Intentional experiments

The package is explicitly an experiment that people can try directly. These
packages should be framed as usable but not fully stable before 1.0.

Example:

- `@starbeamx/*`

## New public surfaces are allowed

Privatizing an implementation package does not require deleting its public
concept. Sometimes the right answer is to create a new public package that
groups several private packages into a principled surface.

For example, low-level protocol packages might become private implementation
details behind a future public author-facing package.

## Privatization checklist

Before making a package private, verify all of the following.

1. It is not an intended direct install target for this release.
2. No public package manifest lists it in `dependencies`, `peerDependencies`,
   or `optionalDependencies`.
3. Public declaration files do not import from it or expose its types.
4. Published JavaScript does not import it as an external package.
5. Any useful boundary remains internally, instead of smearing implementation
   details through consumers.
6. `pnpm test:workspace:pack` enforces the result.

Production stripping is not enough. The release surface is about published
manifests, default/development JavaScript, and declarations as well as
production bundles.

When a private package provides development-only behavior, preserve the public
behavior through a public package boundary before making the implementation
private. For example, `@starbeam/debug` is internal, but `@starbeam/universal`
still owns the public development-mode `DEBUG` bootstrap and verifies it in
development and production artifacts.

## Classification states

Use these states while triaging packages.

- **Public:** should appear in npm release plans.
- **Private:** workspace implementation detail; should not publish.
- **Candidate:** likely private, but needs engineering work to remove manifest,
  JavaScript, or declaration leaks.
- **Decision needed:** package has a plausible public story, but we have not
  decided whether to support that audience/API in this release.
- **Public experiment:** intentionally publishable experiment; usable directly,
  but not presented as fully stable before 1.0.

## Current working examples

- `vite-env` is private local type/test support.
- `@starbeam/preact-utils` is private for the current release arc, while its
  internal boundary remains inside `@starbeam/preact` for possible future
  extraction.
- `@starbeam/shared` is public for architectural reasons.
- `@starbeam/verify` is private internal assertion/type-narrowing support. A
  tidy helper API is not a public-package argument by itself.
- `@starbeam/debug` is private development/runtime support. Its load-bearing
  behavior is the `@starbeam/universal` debug bootstrap, which is kept as public
  behavior and covered by artifact tests.
