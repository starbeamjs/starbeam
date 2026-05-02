# Changelog

## Release (2026-05-02)

* @starbeam/preact 0.9.0 (major)
* @starbeam/react 0.9.0 (major)
* @starbeam/use-strict-lifecycle 0.9.0 (major)
* @starbeam/collections 0.9.0 (minor)
* @starbeam/core 0.9.0 (major)
* @starbeam/interfaces 0.9.0 (major)
* @starbeam/reactive 0.9.0 (minor)
* @starbeam/renderer 0.9.0 (minor)
* @starbeam/resource 0.1.0 (minor)
* @starbeam/runtime 0.9.0 (minor)
* @starbeam/service 0.1.0 (minor)
* @starbeam/shared 1.4.0 (major)
* @starbeam/tags 0.1.0 (minor)
* @starbeam/universal 0.9.0 (major)
* @starbeam/vue 0.9.0 (minor)
* @starbeamx/store 0.9.0 (major)
* @starbeamx/vanilla 0.9.0 (major)

#### :boom: Breaking Change
* `@starbeam/react`
  * [#172](https://github.com/starbeamjs/starbeam/pull/172) chore(react): delete two dead-code paths (duplicate useReactive + broken useDeps) ([@wycats](https://github.com/wycats))
  * [#173](https://github.com/starbeamjs/starbeam/pull/173) feat(react): React Compiler 1.0 compatibility + adapter surface collapse ([@wycats](https://github.com/wycats))
* `@starbeam/preact`, `@starbeam/react`, `@starbeam/use-strict-lifecycle`, `@starbeam/core`, `@starbeam/interfaces`, `@starbeam/shared`, `@starbeam/universal`, `@starbeamx/store`, `@starbeamx/vanilla`
  * [#60](https://github.com/starbeamjs/starbeam/pull/60) Resource 2.0 ([@wycats](https://github.com/wycats))

#### :rocket: Enhancement
* `@starbeam/interfaces`
  * [#149](https://github.com/starbeamjs/starbeam/pull/149) Better production stripping - 61KB smaller, 63% of `main`'s size, 2.7x smaller ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
* `@starbeam/preact`, `@starbeam/react`, `@starbeam/use-strict-lifecycle`, `@starbeam/collections`, `@starbeam/core`, `@starbeam/interfaces`, `@starbeam/reactive`, `@starbeam/renderer`, `@starbeam/resource`, `@starbeam/runtime`, `@starbeam/service`, `@starbeam/shared`, `@starbeam/tags`, `@starbeam/universal`, `@starbeam/vue`, `@starbeamx/store`, `@starbeamx/vanilla`
  * [#112](https://github.com/starbeamjs/starbeam/pull/112) Resource Reform ([@wycats](https://github.com/wycats))

#### :bug: Bug Fix
* `@starbeam/react`, `@starbeam/use-strict-lifecycle`
  * [#170](https://github.com/starbeamjs/starbeam/pull/170) fix(react): don't rebuild instance during Activity hide-transition renders ([@wycats](https://github.com/wycats))
* `@starbeam/preact`, `@starbeam/react`, `@starbeam/use-strict-lifecycle`, `@starbeam/collections`, `@starbeam/core`, `@starbeam/interfaces`, `@starbeam/reactive`, `@starbeam/renderer`, `@starbeam/resource`, `@starbeam/runtime`, `@starbeam/service`, `@starbeam/shared`, `@starbeam/tags`, `@starbeam/universal`, `@starbeam/vue`, `@starbeamx/store`, `@starbeamx/vanilla`
  * [#157](https://github.com/starbeamjs/starbeam/pull/157) Add CI check for forbidden texts ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
* Other
  * [#125](https://github.com/starbeamjs/starbeam/pull/125) domtree packages need to be published ([@NullVoxPopuli](https://github.com/NullVoxPopuli))

#### :memo: Documentation
* [#185](https://github.com/starbeamjs/starbeam/pull/185) Document package surface heuristics ([@wycats](https://github.com/wycats))

#### :house: Internal
* `@starbeam/interfaces`
  * [#189](https://github.com/starbeamjs/starbeam/pull/189) Make domtree packages private ([@wycats](https://github.com/wycats))
  * [#181](https://github.com/starbeamjs/starbeam/pull/181) Tighten release surface verification ([@wycats](https://github.com/wycats))
* Other
  * [#188](https://github.com/starbeamjs/starbeam/pull/188) Make modifier package private ([@wycats](https://github.com/wycats))
  * [#177](https://github.com/starbeamjs/starbeam/pull/177) Mark vite-env private ([@wycats](https://github.com/wycats))
  * [#174](https://github.com/starbeamjs/starbeam/pull/174) Update release-plan ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
  * [#175](https://github.com/starbeamjs/starbeam/pull/175) ci(release): use GitHub App token for release-preview PRs ([@wycats](https://github.com/wycats))
  * [#160](https://github.com/starbeamjs/starbeam/pull/160) make dev-compile private ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
  * [#159](https://github.com/starbeamjs/starbeam/pull/159) include workspace packages ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
  * [#145](https://github.com/starbeamjs/starbeam/pull/145) Update the main changelog ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
  * [#139](https://github.com/starbeamjs/starbeam/pull/139) pnpm by default doesn't publish when there are git changes, we need t… ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
  * [#126](https://github.com/starbeamjs/starbeam/pull/126) Add positivity to the infra ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
  * [#131](https://github.com/starbeamjs/starbeam/pull/131) Change the ci.yml lint script to use turbo ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
  * [#130](https://github.com/starbeamjs/starbeam/pull/130) List failed packages as summary at end of unstable release ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
  * [#129](https://github.com/starbeamjs/starbeam/pull/129) Fix/unstable release unpublished package ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
  * [#128](https://github.com/starbeamjs/starbeam/pull/128) Fix/idempotent unstable release ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
  * [#127](https://github.com/starbeamjs/starbeam/pull/127) Do not try to publish if the package is already published ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
  * [#123](https://github.com/starbeamjs/starbeam/pull/123) fix runtime issue ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
  * [#122](https://github.com/starbeamjs/starbeam/pull/122) fix-typo for unstable-release helpers ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
  * [#120](https://github.com/starbeamjs/starbeam/pull/120) Adjust publish-unstable.yml for new location ([@wycats](https://github.com/wycats))
  * [#115](https://github.com/starbeamjs/starbeam/pull/115) Publish with --access=public, per the updates from embroider ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
  * [#108](https://github.com/starbeamjs/starbeam/pull/108) Allow manual running of the ci workflow ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
  * [#71](https://github.com/starbeamjs/starbeam/pull/71) Remove errant import ([@wycats](https://github.com/wycats))
  * [#68](https://github.com/starbeamjs/starbeam/pull/68) Remove chalk from runtime build ([@wycats](https://github.com/wycats))
  * [#65](https://github.com/starbeamjs/starbeam/pull/65) Fix streaming output ([@wycats](https://github.com/wycats))
  * [#63](https://github.com/starbeamjs/starbeam/pull/63) Fix json lints ([@wycats](https://github.com/wycats))
  * [#62](https://github.com/starbeamjs/starbeam/pull/62) Break up the giant scripts package ([@wycats](https://github.com/wycats))
  * [#53](https://github.com/starbeamjs/starbeam/pull/53) Fix scripts in CONTRIBUTING.md ([@elwayman02](https://github.com/elwayman02))
  * [#50](https://github.com/starbeamjs/starbeam/pull/50) Migrate to babel for rollup builds ([@wycats](https://github.com/wycats))
  * [#49](https://github.com/starbeamjs/starbeam/pull/49) Fix the build when deps have imports in package.json ([@wycats](https://github.com/wycats))
  * [#47](https://github.com/starbeamjs/starbeam/pull/47) Prepare 0.7.2 ([@wycats](https://github.com/wycats))
  * [#46](https://github.com/starbeamjs/starbeam/pull/46) Trigger build ([@wycats](https://github.com/wycats))
  * [#45](https://github.com/starbeamjs/starbeam/pull/45) Add changeset ([@wycats](https://github.com/wycats))
  * [#44](https://github.com/starbeamjs/starbeam/pull/44) More lint cleanup ([@wycats](https://github.com/wycats))
  * [#43](https://github.com/starbeamjs/starbeam/pull/43) Prepare for 0.7 ([@wycats](https://github.com/wycats))
  * [#41](https://github.com/starbeamjs/starbeam/pull/41) Prepare 061 ([@wycats](https://github.com/wycats))
  * [#39](https://github.com/starbeamjs/starbeam/pull/39) Prepare-060 ([@wycats](https://github.com/wycats))
  * [#38](https://github.com/starbeamjs/starbeam/pull/38) Better types for usereactivesetup ([@wycats](https://github.com/wycats))
  * [#36](https://github.com/starbeamjs/starbeam/pull/36) Bump deps ([@wycats](https://github.com/wycats))
  * [#35](https://github.com/starbeamjs/starbeam/pull/35) Remove the need to install @starbeam/peer as a peer ([@wycats](https://github.com/wycats))
  * [#34](https://github.com/starbeamjs/starbeam/pull/34) Refactor core ([@wycats](https://github.com/wycats))
  * [#33](https://github.com/starbeamjs/starbeam/pull/33) Prepare 0.5.7 ([@wycats](https://github.com/wycats))
  * [#32](https://github.com/starbeamjs/starbeam/pull/32) Fix the bug in the react-lite-query demo ([@wycats](https://github.com/wycats))
  * [#31](https://github.com/starbeamjs/starbeam/pull/31) Improvements for pure ESM builds ([@wycats](https://github.com/wycats))
* `@starbeam/react`, `@starbeam/renderer`
  * [#187](https://github.com/starbeamjs/starbeam/pull/187) Add renderer and modifier contract baselines ([@wycats](https://github.com/wycats))
* `@starbeam/preact`, `@starbeam/react`, `@starbeam/interfaces`, `@starbeam/reactive`, `@starbeam/resource`, `@starbeam/runtime`, `@starbeam/service`, `@starbeam/tags`, `@starbeam/universal`, `@starbeam/vue`
  * [#186](https://github.com/starbeamjs/starbeam/pull/186) Make core-utils internal ([@wycats](https://github.com/wycats))
* `@starbeam/preact`, `@starbeam/react`, `@starbeam/collections`, `@starbeam/resource`, `@starbeam/service`, `@starbeam/universal`, `@starbeam/vue`, `@starbeamx/store`, `@starbeamx/vanilla`
  * [#184](https://github.com/starbeamjs/starbeam/pull/184) Make debug an internal package ([@wycats](https://github.com/wycats))
* `@starbeam/universal`
  * [#183](https://github.com/starbeamjs/starbeam/pull/183) Verify debug bootstrap artifacts ([@wycats](https://github.com/wycats))
* `@starbeam/preact`, `@starbeam/react`, `@starbeam/collections`, `@starbeam/reactive`, `@starbeam/resource`, `@starbeam/runtime`, `@starbeam/universal`, `@starbeam/vue`, `@starbeamx/store`
  * [#182](https://github.com/starbeamjs/starbeam/pull/182) Make verify an internal package ([@wycats](https://github.com/wycats))
* `@starbeam/preact`
  * [#180](https://github.com/starbeamjs/starbeam/pull/180) Inline preact-utils internals into preact ([@wycats](https://github.com/wycats))
  * [#73](https://github.com/starbeamjs/starbeam/pull/73) Add /setup export from preact ([@wycats](https://github.com/wycats))
* `@starbeam/shared`
  * [#179](https://github.com/starbeamjs/starbeam/pull/179) Configure shared breaking releases as minors ([@wycats](https://github.com/wycats))
* `@starbeam/preact`, `@starbeam/react`, `@starbeam/use-strict-lifecycle`, `@starbeam/collections`, `@starbeam/core`, `@starbeam/interfaces`, `@starbeam/reactive`, `@starbeam/renderer`, `@starbeam/resource`, `@starbeam/runtime`, `@starbeam/service`, `@starbeam/tags`, `@starbeam/universal`, `@starbeam/vue`, `@starbeamx/store`, `@starbeamx/vanilla`
  * [#178](https://github.com/starbeamjs/starbeam/pull/178) Configure pre-1.0 breaking releases as minors ([@wycats](https://github.com/wycats))
* `@starbeam/react`
  * [#171](https://github.com/starbeamjs/starbeam/pull/171) docs(tests): rewrite setup() activation-probe comment to match observed reality ([@wycats](https://github.com/wycats))
  * [#169](https://github.com/starbeamjs/starbeam/pull/169) test: Activity probe \u2014 documents hide/show activation behavior ([@wycats](https://github.com/wycats))
  * [#168](https://github.com/starbeamjs/starbeam/pull/168) test: transition probe — scheduler does not participate in React transitions ([@wycats](https://github.com/wycats))
  * [#167](https://github.com/starbeamjs/starbeam/pull/167) chore: delete useSyncReactive prototype ([@wycats](https://github.com/wycats))
  * [#166](https://github.com/starbeamjs/starbeam/pull/166) test: activation probes for §14/§15 semantics ([@wycats](https://github.com/wycats))
* `@starbeam/use-strict-lifecycle`
  * [#165](https://github.com/starbeamjs/starbeam/pull/165) chore: rename updating-ref.spec.ts to test-react.spec.ts ([@wycats](https://github.com/wycats))
* `@starbeam/preact`, `@starbeam/react`, `@starbeam/use-strict-lifecycle`, `@starbeam/collections`, `@starbeam/core`, `@starbeam/interfaces`, `@starbeam/reactive`, `@starbeam/renderer`, `@starbeam/resource`, `@starbeam/runtime`, `@starbeam/service`, `@starbeam/shared`, `@starbeam/tags`, `@starbeam/universal`, `@starbeam/vue`, `@starbeamx/store`, `@starbeamx/vanilla`
  * [#162](https://github.com/starbeamjs/starbeam/pull/162) chore: infra modernization arc ([@wycats](https://github.com/wycats))
  * [#157](https://github.com/starbeamjs/starbeam/pull/157) Add CI check for forbidden texts ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
  * [#156](https://github.com/starbeamjs/starbeam/pull/156) Add dev-compile and update references to starbeam-dev/compile ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
  * [#147](https://github.com/starbeamjs/starbeam/pull/147) Use the changelog from the monorepo root in each package ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
* `@starbeamx/vanilla`
  * [#121](https://github.com/starbeamjs/starbeam/pull/121) Chore/local perf spotchecking ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
* `@starbeam/preact`, `@starbeam/react`, `@starbeam/use-strict-lifecycle`, `@starbeam/collections`, `@starbeam/core`, `@starbeam/reactive`, `@starbeam/renderer`, `@starbeam/resource`, `@starbeam/runtime`, `@starbeam/service`, `@starbeam/shared`, `@starbeam/tags`, `@starbeam/universal`, `@starbeam/vue`
  * [#138](https://github.com/starbeamjs/starbeam/pull/138) Build and publish the 'unstable' tag correctly ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
* `@starbeam/resource`, `@starbeam/service`, `@starbeam/tags`
  * [#107](https://github.com/starbeamjs/starbeam/pull/107) Add new package and workflow for publishing unstable releases ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
* `@starbeam/react`, `@starbeam/use-strict-lifecycle`, `@starbeam/universal`
  * [#78](https://github.com/starbeamjs/starbeam/pull/78) [WIP] Improvements to `@starbeam/react` ([@wycats](https://github.com/wycats))
* `@starbeam/preact`, `@starbeam/react`, `@starbeam/use-strict-lifecycle`, `@starbeam/core`, `@starbeam/interfaces`, `@starbeam/shared`, `@starbeam/universal`, `@starbeamx/store`, `@starbeamx/vanilla`
  * [#77](https://github.com/starbeamjs/starbeam/pull/77) Prepare 0.8.7 ([@wycats](https://github.com/wycats))
  * [#74](https://github.com/starbeamjs/starbeam/pull/74) Add /setup export from preact ([@wycats](https://github.com/wycats))
  * [#72](https://github.com/starbeamjs/starbeam/pull/72) Prepare 0.8.6 ([@wycats](https://github.com/wycats))
  * [#70](https://github.com/starbeamjs/starbeam/pull/70) Fix type inference and prepare 0.8.5 ([@wycats](https://github.com/wycats))
  * [#69](https://github.com/starbeamjs/starbeam/pull/69) Fix interfaces and prepare 0.8.4 ([@wycats](https://github.com/wycats))
  * [#64](https://github.com/starbeamjs/starbeam/pull/64) Prepare 0.8 ([@wycats](https://github.com/wycats))
* `@starbeam/preact`, `@starbeam/react`, `@starbeam/core`, `@starbeam/universal`, `@starbeamx/store`, `@starbeamx/vanilla`
  * [#67](https://github.com/starbeamjs/starbeam/pull/67) make debug work in browser ([@wycats](https://github.com/wycats))
* `@starbeam/react`, `@starbeam/use-strict-lifecycle`, `@starbeam/shared`, `@starbeam/universal`, `@starbeamx/store`, `@starbeamx/vanilla`
  * [#66](https://github.com/starbeamjs/starbeam/pull/66) JSNation Demo Smoke Tests ([@wycats](https://github.com/wycats))
* `@starbeam/preact`, `@starbeam/react`, `@starbeam/use-strict-lifecycle`, `@starbeam/interfaces`, `@starbeam/shared`, `@starbeam/universal`, `@starbeamx/store`, `@starbeamx/vanilla`
  * [#61](https://github.com/starbeamjs/starbeam/pull/61) Moved /scripts and /.build into /workspace ([@wycats](https://github.com/wycats))
* `@starbeam/react`, `@starbeam/use-strict-lifecycle`, `@starbeam/core`, `@starbeam/interfaces`, `@starbeam/shared`, `@starbeamx/store`, `@starbeamx/vanilla`
  * [#55](https://github.com/starbeamjs/starbeam/pull/55) Follow-up work ([@wycats](https://github.com/wycats))
  * [#54](https://github.com/starbeamjs/starbeam/pull/54) Build improvements 2.0 ([@wycats](https://github.com/wycats))

#### Committers: 3
- Jordan Hawker ([@elwayman02](https://github.com/elwayman02))
- Yehuda Katz ([@wycats](https://github.com/wycats))
- [@NullVoxPopuli](https://github.com/NullVoxPopuli)

