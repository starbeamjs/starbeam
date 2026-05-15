# Website Technology Decision

This memo records the technology choice for the Starbeam documentation website.
It follows the readiness and positioning work in [WEBSITE-READINESS.md](./WEBSITE-READINESS.md)
and [STARBEAM-POSITIONING.md](./STARBEAM-POSITIONING.md).

This is a decision memo, not the site scaffold.

## Decision

Use **Astro + Starlight** for the documentation website.

The intended shape is:

- custom Astro pages for the homepage and other high-design landing pages;
- Starlight for the docs interior: navigation, sidebar, search, Markdown/MDX
  content, and docs IA;
- shared design tokens and components across both.

The short version:

> Astro owns the brandable site surface. Starlight owns the docs system.

## Why this fits Starbeam

The website has two jobs:

1. Teach the public story clearly:
   - mark root state;
   - the rest is ordinary JavaScript;
   - lifecycle-aware resources scale the model without making first-run docs
     feel heavy.
2. Keep a large docs tree navigable:
   - Start;
   - Core concepts;
   - Framework guides;
   - Library-author guide;
   - Reference;
   - Advanced / implementor;
   - Experiments;
   - Archive.

Astro + Starlight fits because the project needs both custom presentation and a
boring, reliable docs system.

## Design constraints

The design work should be shared before scaffolding the site.

The scaffold should start from a design style guide, not from Starlight defaults.
At minimum, the style guide should capture:

- brand tone and visual references;
- color palette, including light/dark expectations;
- typography choices and scale;
- spacing and layout rhythm;
- code block treatment;
- callout/admonition treatment;
- navigation/sidebar expectations;
- homepage hero direction;
- icon/illustration style;
- example/demo presentation;
- any constraints around motion or interaction.

The goal is not to finalize every pixel before scaffolding. The goal is to avoid
letting the default docs theme define Starbeam's visual identity by accident.

## Why not Starlight-only

Starlight is a good docs framework, but Starbeam's homepage and first-run story
should not be constrained by the default docs shell.

The first page needs to carry positioning, tone, and design. It should be allowed
to feel like Starbeam, not just like documentation.

Use Starlight where its defaults are strengths: docs structure, search, sidebar,
content pages, and accessibility.

## Why not custom Astro-only

A fully custom Astro site would give maximum control, but it would make us build
or assemble too much docs infrastructure too early:

- sidebars;
- search;
- doc collections;
- table of contents behavior;
- accessibility details;
- content conventions.

That work would compete with the real goal: writing the right docs.

## Why not VitePress

VitePress is simple and strong for many docs sites, but it is Vue-shaped and less
natural for a multi-framework Starbeam docs site with custom brand surfaces.

Starbeam's docs need to treat React, Preact, Vue, and Svelte as first-class
framework targets. Astro is a better fit for that posture.

## Why not Docusaurus

Docusaurus has strong docs features, especially versioning, but it is heavier and
more product-shaped than this phase needs.

Versioning should not dominate the first scaffold. Starbeam is still establishing
the 0.9 public story; the first website should optimize for narrative clarity and
content velocity.

## API reference strategy

Do not make generated API docs a blocker for the first scaffold.

Start with hand-written reference pages for the public surface:

- `@starbeam/universal`;
- `@starbeam/resource`;
- `@starbeam/service`;
- `@starbeam/reactive`;
- framework adapters;
- `@starbeam/core` compatibility.

Later, evaluate TypeDoc or a custom export scanner and link generated reference
material into the Starlight docs tree.

## Interactive examples strategy

Do not make interactive examples a blocker for the first scaffold.

Start with static examples and framework-specific code tabs. Astro can later add
interactive islands or embedded demos without forcing the entire docs site into a
single framework.

Possible later steps:

- StackBlitz links;
- embedded examples;
- React/Vue/Svelte demo islands;
- playground pages.

## First scaffold milestone

The first implementation PER should scaffold the site without migrating real
content yet.

Expected scope:

- add an Astro/Starlight docs workspace package;
- create a custom homepage shell;
- create a Starlight docs shell;
- add placeholder pages for the top-level IA sections;
- add initial design tokens from the style guide;
- wire basic scripts into the workspace;
- do not migrate package READMEs yet;
- do not build generated API reference yet;
- do not build interactive examples yet.

This keeps the scaffold small enough to review and lets the information
architecture and design constraints lead the implementation.

## What can change later

This decision does not permanently lock every site decision.

Things that can evolve after the first scaffold:

- visual design details;
- custom Starlight components;
- generated reference docs;
- versioning;
- search provider;
- interactive examples;
- deployment target.

The important decision now is the division of responsibility:

> custom Astro for brand surfaces, Starlight for docs structure.
