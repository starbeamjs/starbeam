---
title: Framework guides
description: "Starbeam's framework adapters connect the same reactive model to React, Preact, Ember, Vue, and Svelte as each adapter matures."
---

Starbeam's state model is framework-neutral. Framework adapters make it feel
native by connecting Starbeam's reactive model to each framework's rendering and
lifecycle rules.

The goal is not one framework with incidental ports. React, Preact, Ember, Vue,
and Svelte are public docs targets, with adapter coverage maturing at different
speeds.

## Same model, native edges

The core model stays the same in every framework:

1. Mark root state reactive. Use `@starbeam/collections` for collection-shaped
   state and `@starbeam/universal` for scalar state and lifecycle APIs.
2. Build ordinary JavaScript abstractions above it.
3. Use resources when state needs setup, sync, or cleanup.
4. Let the adapter connect reads and resources to the framework.

The framework-specific layer should feel small. It is the bridge between
Starbeam's model and the framework's rendering and lifecycle rules. Your domain
model can still expose normal getters, methods, and objects; the adapter is the
place that connects those reads and resources to React, Preact, Ember, Vue, or
Svelte.

Need the package list first? Start with [Install Starbeam](/start/install/).

## Guides

- [**React**](/frameworks/react/): hooks for reactive reads, resources,
  services, and element resources.
- [**Preact**](/frameworks/preact/): adapter installation, reactive reads,
  resources, services, and element resources.
- [**Ember**](/frameworks/ember/): native Glimmer autotracking for Starbeam
  reads, plus resources, services, and element resources.
- [**Vue**](/frameworks/vue/): setup helpers and directives for reactive state,
  resources, services, and element resources.
- [**Svelte**](/frameworks/svelte/): current Svelte 5 slice with experimental
  `fromStarbeam()` reads and element-resource attachments. Component-resource and
  service helpers are not exposed yet.

Some guide details may mature at different speeds. The top-level posture stays
the same: Starbeam is designed to make the same domain-shaped reactive model work
across modern JavaScript frameworks.
