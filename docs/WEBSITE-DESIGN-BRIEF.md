# Website Design Brief

This brief translates the draft Starbeam style guide into implementation
constraints for the documentation website. It follows the positioning,
readiness, and technology decisions in:

- [STARBEAM-POSITIONING.md](./STARBEAM-POSITIONING.md)
- [WEBSITE-READINESS.md](./WEBSITE-READINESS.md)
- [WEBSITE-TECHNOLOGY.md](./WEBSITE-TECHNOLOGY.md)

The style guide is a draft, so this brief should guide the first scaffold without
locking every visual decision permanently.

## Design thesis

Starbeam should feel like a joyful reactivity engine for people who care about
clarity and craft.

The visual system should communicate:

- **joyful, not childish**;
- **precise, not sterile**;
- **developer-native**;
- **open-source polished**.

This matches the product thesis:

> Mark root state. The rest is just JavaScript.

The design should make Starbeam feel approachable and lively without making the
technical model seem lightweight or unserious.

## Technology implication

The style guide reinforces the Astro + Starlight decision:

- custom Astro pages should own the homepage and other brand-heavy surfaces;
- Starlight should own the docs interior: navigation, search, table of contents,
  and Markdown/MDX page structure;
- shared tokens should keep the custom pages and Starlight pages visually
  coherent.

Do not let Starlight defaults define the Starbeam brand by accident.

## Brand principles

### Joyful, not childish

Use glow, optional motion, and illustration to make the site feel alive. Keep
spacing, typography, and copy disciplined so the result still feels like a
serious technical project.

### Precise, not sterile

Use clear hierarchy, crisp code samples, and restrained layout. Let the star,
beam, and glow provide warmth so precision does not become coldness.

### Developer-native

The angle brackets, code-oriented icons, and documentation layouts should make it
obvious that Starbeam is built for JavaScript developers.

### Open-source polished

The site should feel reliable, public, and ready to scale. Avoid a “toy demo”
feel even when using playful brand elements.

## Core visual motifs

The star/beam mark is the main metaphor:

- the star is the stable center;
- the glow is reactivity becoming visible;
- the beam implies propagation and illumination;
- the angle brackets signal JavaScript and developer fluency;
- surrounding dots and small stars can suggest activity without drawing a
  dependency graph.

Use the motif to support the story, not as decoration everywhere.

## Color tokens

Start with these named tokens from the style guide:

| Token  | Hex       | Role                                                  |
| ------ | --------- | ----------------------------------------------------- |
| Ink    | `#1E2436` | Primary text, deep surfaces, authority.               |
| Indigo | `#2D3550` | Secondary dark surfaces and depth.                    |
| Beam   | `#00C2B3` | Brand accent, icons, active states, technical energy. |
| Glow   | `#FFDB4D` | Emphasis, star center, small moments of delight.      |
| Mist   | `#F6F7F9` | Page backgrounds and soft surfaces.                   |

The first scaffold should create CSS custom properties for these tokens, plus
semantic aliases for:

- page background;
- card background;
- primary text;
- muted text;
- link text;
- accent;
- focus ring;
- border;
- code background;
- callout backgrounds.

Light mode should be the first-class design. Dark mode can be supported early if
straightforward, but it should not block the scaffold.

Do not use bright Beam directly for body text links unless contrast is verified.
The first scaffold should include a darker accessible link/action alias for text
on light Mist or white backgrounds, while keeping Beam available for icons,
fills, borders, and decorative accents.

## Motion and accessibility

Motion should be optional and respectful of user preferences.

The first scaffold must:

- avoid motion that is required to understand content;
- respect `prefers-reduced-motion` for transitions, looping effects, and
  decorative animation;
- provide static fallbacks for any animated star, beam, or glow treatment;
- keep focus states visible and not dependent on animation alone.

Small hover transitions are fine if they are subtle and disabled or simplified
under reduced-motion preferences.

## Typography

The style guide points toward a high-contrast display serif for brand moments and
a clean sans for body/UI.

Use typography roles rather than hard-coding final font decisions in early work:

- **Display**: homepage hero, major section headlines.
- **UI / body**: docs prose, navigation, cards, captions.
- **Mono**: code blocks, inline code, API reference.

The first scaffold should establish token names and scale, even if final webfont
choices are still adjustable.

## Layout and surfaces

The visual language uses:

- soft white/mist backgrounds;
- large rounded cards;
- subtle shadows;
- generous spacing;
- faint cyan gradients or waves;
- calm section separation rather than heavy borders.

Docs pages should feel quieter than the homepage but still branded.

Use cards for:

- framework choices;
- “Why Starbeam?” concept groups;
- package chooser rows;
- feature summaries;
- next-step navigation.

## Docs components needed

The first scaffold should plan for these reusable components:

- brand hero;
- framework selector cards;
- concept cards;
- package chooser table/card;
- code example panel;
- callout/admonition styles;
- “next steps” card grid;
- logo lockup component;
- icon row / principle strip.

These components can start minimal. The goal is to create the slots where the
style guide belongs.

## Code examples

Code examples should feel precise and readable.

Early requirements:

- clear code block styling;
- inline code with enough contrast;
- support for framework tabs later;
- room for “plain JavaScript” examples before framework examples;
- no interactive playground requirement in the first scaffold.

## Navigation

The docs navigation should follow the readiness IA:

1. Start
2. Core concepts
3. Framework guides
4. Library-author guide
5. Reference
6. Advanced / implementor
7. Experiments
8. Archive

Starlight should own the docs navigation mechanics. Custom Astro pages can have
lighter navigation, but they should still route users into the same IA.

## Asset plan

The style guide identifies the asset family the site will eventually need:

- primary logo SVG;
- horizontal lockup SVG;
- icon mark SVG;
- monochrome variants;
- avatar;
- favicon;
- Open Graph image;
- README banner;
- website hero asset.

The first scaffold should not require all assets to be final, but it should make
room for them and avoid baking temporary artwork into the architecture.

## First scaffold scope

The first implementation PER should include:

- Astro/Starlight workspace package;
- custom homepage shell;
- Starlight docs shell;
- IA placeholder pages;
- first pass design tokens;
- logo/brand asset placeholders;
- minimal card and hero components;
- build/check scripts.

It should not include:

- full content migration;
- generated API reference;
- interactive examples;
- final asset export pipeline;
- full dark-mode polish;
- final responsive design polish beyond basic correctness.

## Open design questions

These can be refined while building:

1. Final display/body/mono font choices.
2. Dark-mode requirements for the first public site.
3. How literal the star/beam motif should be on docs interior pages.
4. Whether framework guide pages need custom landing layouts or ordinary docs
   pages.
5. How much optional animation belongs in the homepage.
6. Whether Open Graph/social assets should be generated from the site or kept as
   exported design assets.

## Success criteria for the scaffold

The first scaffold is successful if:

- it visibly feels like Starbeam, not default Starlight;
- the IA is represented in the docs navigation;
- the homepage can carry the positioning memo's story;
- docs pages remain calm, readable, and maintainable;
- design tokens can evolve without rewriting the site;
- the next PR can start filling in real content instead of reworking the shell.
