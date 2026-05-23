# Changelog

## Release (2026-05-23)

* @starbeam/ember 0.9.0 (minor)
* @starbeam/preact 0.9.0 (major)
* @starbeam/react 0.9.0 (major)
* @starbeam/use-strict-lifecycle 0.9.0 (major)
* @starbeam/svelte 0.9.0 (minor)
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
* `@starbeam/ember`, `@starbeam/interfaces`, `@starbeam/reactive`, `@starbeam/runtime`
  * [#290](https://github.com/starbeamjs/starbeam/pull/290) feat(ember): mirror Starbeam tags into Glimmer ([@wycats](https://github.com/wycats))
* `@starbeam/ember`
  * [#286](https://github.com/starbeamjs/starbeam/pull/286) Implement Ember adapter seams ([@wycats](https://github.com/wycats))
* `@starbeam/svelte`, `@starbeam/runtime`
  * [#260](https://github.com/starbeamjs/starbeam/pull/260) feat(svelte): add fromStarbeam read bridge ([@wycats](https://github.com/wycats))
* `@starbeam/interfaces`
  * [#241](https://github.com/starbeamjs/starbeam/pull/241) chore(surface): preserve protocol artifact keys ([@wycats](https://github.com/wycats))
  * [#149](https://github.com/starbeamjs/starbeam/pull/149) Better production stripping - 61KB smaller, 63% of `main`'s size, 2.7x smaller ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
* `@starbeam/universal`
  * [#239](https://github.com/starbeamjs/starbeam/pull/239) feat(universal): add ResourceList to canonical surface ([@wycats](https://github.com/wycats))
* Other
  * [#226](https://github.com/starbeamjs/starbeam/pull/226) Reserve public object property keys ([@wycats](https://github.com/wycats))
* `@starbeam/svelte`, `@starbeam/renderer`, `@starbeam/vue`
  * [#223](https://github.com/starbeamjs/starbeam/pull/223) Extract shared element resource setup ([@wycats](https://github.com/wycats))
* `@starbeam/vue`
  * [#222](https://github.com/starbeamjs/starbeam/pull/222) Return augmented refs from Vue elementResource ([@wycats](https://github.com/wycats))
  * [#215](https://github.com/starbeamjs/starbeam/pull/215) Add Vue element resource directive ([@wycats](https://github.com/wycats))
* `@starbeam/svelte`
  * [#221](https://github.com/starbeamjs/starbeam/pull/221) Add Svelte elementResource alias ([@wycats](https://github.com/wycats))
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
* Other
  * [#291](https://github.com/starbeamjs/starbeam/pull/291) docs: add Ember adapter guide ([@wycats](https://github.com/wycats))
  * [#283](https://github.com/starbeamjs/starbeam/pull/283) docs: expand reference section ([@wycats](https://github.com/wycats))
  * [#282](https://github.com/starbeamjs/starbeam/pull/282) docs: add services and element resource concepts ([@wycats](https://github.com/wycats))
  * [#276](https://github.com/starbeamjs/starbeam/pull/276) docs: add documentation dashboard ([@wycats](https://github.com/wycats))
  * [#275](https://github.com/starbeamjs/starbeam/pull/275) docs: align root README ([@wycats](https://github.com/wycats))
  * [#274](https://github.com/starbeamjs/starbeam/pull/274) docs: add experiments overview ([@wycats](https://github.com/wycats))
  * [#272](https://github.com/starbeamjs/starbeam/pull/272) docs: add archive overview ([@wycats](https://github.com/wycats))
  * [#271](https://github.com/starbeamjs/starbeam/pull/271) docs: add advanced overview ([@wycats](https://github.com/wycats))
  * [#270](https://github.com/starbeamjs/starbeam/pull/270) docs: fix homepage hero padding ([@wycats](https://github.com/wycats))
  * [#269](https://github.com/starbeamjs/starbeam/pull/269) docs: add library-author guide ([@wycats](https://github.com/wycats))
  * [#268](https://github.com/starbeamjs/starbeam/pull/268) docs: add package chooser ([@wycats](https://github.com/wycats))
  * [#267](https://github.com/starbeamjs/starbeam/pull/267) docs: remove homepage hero rail ([@wycats](https://github.com/wycats))
  * [#266](https://github.com/starbeamjs/starbeam/pull/266) docs: polish homepage layout ([@wycats](https://github.com/wycats))
  * [#264](https://github.com/starbeamjs/starbeam/pull/264) docs: expand homepage narrative ([@wycats](https://github.com/wycats))
  * [#263](https://github.com/starbeamjs/starbeam/pull/263) docs: add lifecycle concepts ([@wycats](https://github.com/wycats))
  * [#262](https://github.com/starbeamjs/starbeam/pull/262) docs: add Svelte framework guide ([@wycats](https://github.com/wycats))
  * [#259](https://github.com/starbeamjs/starbeam/pull/259) docs: propose first-class Svelte adapter ([@wycats](https://github.com/wycats))
  * [#258](https://github.com/starbeamjs/starbeam/pull/258) docs: add Vue framework guide ([@wycats](https://github.com/wycats))
  * [#257](https://github.com/starbeamjs/starbeam/pull/257) docs: add Preact framework guide ([@wycats](https://github.com/wycats))
  * [#255](https://github.com/starbeamjs/starbeam/pull/255) docs: add React framework guide ([@wycats](https://github.com/wycats))
  * [#254](https://github.com/starbeamjs/starbeam/pull/254) docs: align overview pages with collections-first start ([@wycats](https://github.com/wycats))
  * [#253](https://github.com/starbeamjs/starbeam/pull/253) docs: expand Start walkthrough ([@wycats](https://github.com/wycats))
  * [#252](https://github.com/starbeamjs/starbeam/pull/252) docs: polish Starlight sidebar ([@wycats](https://github.com/wycats))
  * [#251](https://github.com/starbeamjs/starbeam/pull/251) docs: configure Vercel deployment ([@wycats](https://github.com/wycats))
  * [#250](https://github.com/starbeamjs/starbeam/pull/250) docs: update website positioning copy ([@wycats](https://github.com/wycats))
  * [#249](https://github.com/starbeamjs/starbeam/pull/249) docs: refine Starbeam positioning ([@wycats](https://github.com/wycats))
  * [#248](https://github.com/starbeamjs/starbeam/pull/248) docs: polish website UI ([@wycats](https://github.com/wycats))
  * [#247](https://github.com/starbeamjs/starbeam/pull/247) docs: brand Starlight interior ([@wycats](https://github.com/wycats))
  * [#246](https://github.com/starbeamjs/starbeam/pull/246) docs: scaffold website shell ([@wycats](https://github.com/wycats))
  * [#245](https://github.com/starbeamjs/starbeam/pull/245) docs: capture website design brief ([@wycats](https://github.com/wycats))
  * [#244](https://github.com/starbeamjs/starbeam/pull/244) docs: choose website technology ([@wycats](https://github.com/wycats))
  * [#243](https://github.com/starbeamjs/starbeam/pull/243) docs: capture Starbeam positioning ([@wycats](https://github.com/wycats))
  * [#242](https://github.com/starbeamjs/starbeam/pull/242) docs: map website readiness ([@wycats](https://github.com/wycats))
  * [#236](https://github.com/starbeamjs/starbeam/pull/236) docs(renderer): confirm adapter-author boundary ([@wycats](https://github.com/wycats))
  * [#235](https://github.com/starbeamjs/starbeam/pull/235) docs(surface): settle modifier internal cleanup policy ([@wycats](https://github.com/wycats))
  * [#234](https://github.com/starbeamjs/starbeam/pull/234) docs: add pull request template ([@wycats](https://github.com/wycats))
  * [#230](https://github.com/starbeamjs/starbeam/pull/230) docs(package-surface): add lifecycle package audience matrix ([@wycats](https://github.com/wycats))
  * [#224](https://github.com/starbeamjs/starbeam/pull/224) Document renderer element resource setup boundary ([@wycats](https://github.com/wycats))
  * [#216](https://github.com/starbeamjs/starbeam/pull/216) Record Svelte attachment recon ([@wycats](https://github.com/wycats))
  * [#214](https://github.com/starbeamjs/starbeam/pull/214) Document DOM attachment boundary decision ([@wycats](https://github.com/wycats))
  * [#212](https://github.com/starbeamjs/starbeam/pull/212) Record Vue directive DOM attachment evidence ([@wycats](https://github.com/wycats))
  * [#185](https://github.com/starbeamjs/starbeam/pull/185) Document package surface heuristics ([@wycats](https://github.com/wycats))
* `@starbeam/use-strict-lifecycle`
  * [#285](https://github.com/starbeamjs/starbeam/pull/285) docs: add use strict lifecycle README ([@wycats](https://github.com/wycats))
* `@starbeam/svelte`, `@starbeam/vue`, `@starbeamx/store`, `@starbeamx/vanilla`
  * [#284](https://github.com/starbeamjs/starbeam/pull/284) docs: align package status language ([@wycats](https://github.com/wycats))
* `@starbeam/core`
  * [#281](https://github.com/starbeamjs/starbeam/pull/281) docs: add core compatibility migration ([@wycats](https://github.com/wycats))
* `@starbeam/preact`
  * [#280](https://github.com/starbeamjs/starbeam/pull/280) docs: add preact package README ([@wycats](https://github.com/wycats))
* `@starbeam/reactive`
  * [#278](https://github.com/starbeamjs/starbeam/pull/278) docs: clarify reactive primitive README ([@wycats](https://github.com/wycats))
  * [#237](https://github.com/starbeamjs/starbeam/pull/237) docs(reactive): classify public primitive surface ([@wycats](https://github.com/wycats))
* `@starbeam/collections`
  * [#279](https://github.com/starbeamjs/starbeam/pull/279) docs: clarify collections surface wording ([@wycats](https://github.com/wycats))
  * [#277](https://github.com/starbeamjs/starbeam/pull/277) docs: add collections concept ([@wycats](https://github.com/wycats))
* `@starbeam/interfaces`, `@starbeam/runtime`, `@starbeam/tags`
  * [#238](https://github.com/starbeamjs/starbeam/pull/238) docs(surface): document protocol surface policy ([@wycats](https://github.com/wycats))
* `@starbeam/universal`
  * [#233](https://github.com/starbeamjs/starbeam/pull/233) docs(universal): settle lifecycle umbrella shape ([@wycats](https://github.com/wycats))
* `@starbeam/renderer`, `@starbeam/service`, `@starbeam/universal`
  * [#232](https://github.com/starbeamjs/starbeam/pull/232) docs(service): document app-scoped service placement ([@wycats](https://github.com/wycats))
* `@starbeam/resource`
  * [#231](https://github.com/starbeamjs/starbeam/pull/231) docs(resource): align README with current lifecycle API ([@wycats](https://github.com/wycats))
* `@starbeam/react`
  * [#229](https://github.com/starbeamjs/starbeam/pull/229) docs(react): clarify element resource hook boundary ([@wycats](https://github.com/wycats))
* `@starbeam/vue`
  * [#228](https://github.com/starbeamjs/starbeam/pull/228) docs(vue): clarify template element resource ergonomics ([@wycats](https://github.com/wycats))
* `@starbeam/svelte`
  * [#227](https://github.com/starbeamjs/starbeam/pull/227) docs(svelte): promote elementResource as primary attachment API ([@wycats](https://github.com/wycats))
* `@starbeam/renderer`
  * [#225](https://github.com/starbeamjs/starbeam/pull/225) Add package surface PER roadmap ([@wycats](https://github.com/wycats))
* `@starbeam/react`, `@starbeam/resource`, `@starbeam/service`
  * [#213](https://github.com/starbeamjs/starbeam/pull/213) Document domain-shaped reactive APIs ([@wycats](https://github.com/wycats))

#### :house: Internal
* Other
  * [#146](https://github.com/starbeamjs/starbeam/pull/146) Prepare Release ([@github-actions[bot]](https://github.com/apps/github-actions))
  * [#289](https://github.com/starbeamjs/starbeam/pull/289) chore(workspace): run direct lint and type tasks ([@wycats](https://github.com/wycats))
  * [#256](https://github.com/starbeamjs/starbeam/pull/256) chore: clarify optional PR template sections ([@wycats](https://github.com/wycats))
  * [#240](https://github.com/starbeamjs/starbeam/pull/240) chore(vscode): update rewrap recommendation ([@wycats](https://github.com/wycats))
  * [#210](https://github.com/starbeamjs/starbeam/pull/210) Reconcile modifier element resource direction ([@wycats](https://github.com/wycats))
  * [#202](https://github.com/starbeamjs/starbeam/pull/202) Record DOM attachment probe findings ([@wycats](https://github.com/wycats))
  * [#199](https://github.com/starbeamjs/starbeam/pull/199) Sketch DOM attachment contract ([@wycats](https://github.com/wycats))
  * [#197](https://github.com/starbeamjs/starbeam/pull/197) Finalize core-utils private surface decision ([@wycats](https://github.com/wycats))
  * [#196](https://github.com/starbeamjs/starbeam/pull/196) Finalize renderer public surface decision ([@wycats](https://github.com/wycats))
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
* `@starbeam/svelte`
  * [#220](https://github.com/starbeamjs/starbeam/pull/220) Test Svelte element resource store reuse ([@wycats](https://github.com/wycats))
* `@starbeam/vue`
  * [#211](https://github.com/starbeamjs/starbeam/pull/211) Probe Vue directive element resources ([@wycats](https://github.com/wycats))
* `@starbeam/preact`
  * [#209](https://github.com/starbeamjs/starbeam/pull/209) Add Preact element resource hook ([@wycats](https://github.com/wycats))
  * [#208](https://github.com/starbeamjs/starbeam/pull/208) Support Preact resource deps ([@wycats](https://github.com/wycats))
  * [#207](https://github.com/starbeamjs/starbeam/pull/207) Probe Preact DOM attachment parity ([@wycats](https://github.com/wycats))
  * [#180](https://github.com/starbeamjs/starbeam/pull/180) Inline preact-utils internals into preact ([@wycats](https://github.com/wycats))
  * [#73](https://github.com/starbeamjs/starbeam/pull/73) Add /setup export from preact ([@wycats](https://github.com/wycats))
* `@starbeam/react`
  * [#206](https://github.com/starbeamjs/starbeam/pull/206) Document React element resources ([@wycats](https://github.com/wycats))
  * [#204](https://github.com/starbeamjs/starbeam/pull/204) Bootstrap registered resource sync ([@wycats](https://github.com/wycats))
  * [#203](https://github.com/starbeamjs/starbeam/pull/203) Probe DOM attachment first sync bootstrap ([@wycats](https://github.com/wycats))
  * [#201](https://github.com/starbeamjs/starbeam/pull/201) Probe React DOM attachment sync boundary ([@wycats](https://github.com/wycats))
  * [#200](https://github.com/starbeamjs/starbeam/pull/200) Add React DOM attachment probe ([@wycats](https://github.com/wycats))
  * [#171](https://github.com/starbeamjs/starbeam/pull/171) docs(tests): rewrite setup() activation-probe comment to match observed reality ([@wycats](https://github.com/wycats))
  * [#169](https://github.com/starbeamjs/starbeam/pull/169) test: Activity probe \u2014 documents hide/show activation behavior ([@wycats](https://github.com/wycats))
  * [#168](https://github.com/starbeamjs/starbeam/pull/168) test: transition probe — scheduler does not participate in React transitions ([@wycats](https://github.com/wycats))
  * [#167](https://github.com/starbeamjs/starbeam/pull/167) chore: delete useSyncReactive prototype ([@wycats](https://github.com/wycats))
  * [#166](https://github.com/starbeamjs/starbeam/pull/166) test: activation probes for §14/§15 semantics ([@wycats](https://github.com/wycats))
* `@starbeam/react`, `@starbeam/runtime`
  * [#205](https://github.com/starbeamjs/starbeam/pull/205) Add React element resource hook ([@wycats](https://github.com/wycats))
* `@starbeam/runtime`
  * [#198](https://github.com/starbeamjs/starbeam/pull/198) Frame modifier DOM attachment concept ([@wycats](https://github.com/wycats))
* `@starbeam/renderer`
  * [#195](https://github.com/starbeamjs/starbeam/pull/195) Keep renderer setupFormula internal ([@wycats](https://github.com/wycats))
  * [#194](https://github.com/starbeamjs/starbeam/pull/194) Harden renderer app lifetime contract ([@wycats](https://github.com/wycats))
  * [#193](https://github.com/starbeamjs/starbeam/pull/193) Document React resource contract boundary ([@wycats](https://github.com/wycats))
  * [#192](https://github.com/starbeamjs/starbeam/pull/192) Harden renderer manager contract tests ([@wycats](https://github.com/wycats))
  * [#191](https://github.com/starbeamjs/starbeam/pull/191) Classify renderer public surface ([@wycats](https://github.com/wycats))
  * [#190](https://github.com/starbeamjs/starbeam/pull/190) Start renderer public hardening ([@wycats](https://github.com/wycats))
* `@starbeam/interfaces`
  * [#189](https://github.com/starbeamjs/starbeam/pull/189) Make domtree packages private ([@wycats](https://github.com/wycats))
  * [#181](https://github.com/starbeamjs/starbeam/pull/181) Tighten release surface verification ([@wycats](https://github.com/wycats))
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
* `@starbeam/shared`
  * [#179](https://github.com/starbeamjs/starbeam/pull/179) Configure shared breaking releases as minors ([@wycats](https://github.com/wycats))
* `@starbeam/preact`, `@starbeam/react`, `@starbeam/use-strict-lifecycle`, `@starbeam/collections`, `@starbeam/core`, `@starbeam/interfaces`, `@starbeam/reactive`, `@starbeam/renderer`, `@starbeam/resource`, `@starbeam/runtime`, `@starbeam/service`, `@starbeam/tags`, `@starbeam/universal`, `@starbeam/vue`, `@starbeamx/store`, `@starbeamx/vanilla`
  * [#178](https://github.com/starbeamjs/starbeam/pull/178) Configure pre-1.0 breaking releases as minors ([@wycats](https://github.com/wycats))
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

#### Committers: 4
- GitHub Actions [Bot] ([@github-actions](https://github.com/apps/github-actions))
- Jordan Hawker ([@elwayman02](https://github.com/elwayman02))
- Yehuda Katz ([@wycats](https://github.com/wycats))
- [@NullVoxPopuli](https://github.com/NullVoxPopuli)

