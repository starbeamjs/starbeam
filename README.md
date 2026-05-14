[![npm version](https://badge.fury.io/js/@starbeam%2Funiversal.svg)](https://badge.fury.io/js/@starbeam%2Funiversal)

Starbeam is a new kind of reactive library. It makes reactive programming simple and fun, and **it works with your existing JavaScript framework.**

<center>

| 📖 [docs] | 💬 [discord] |

</center>

---

[docs]: https://starbeamjs.com
[discord]: https://discord.gg/HXq3PMmj8A

The core concepts of Starbeam are documented in the [docs] for users of Starbeam.

The package READMEs have additional implementor-focused documentation:

- [@starbeam/shared]: Primitive Starbeam fundamentals. This package enables multiple
  copies of Starbeam to interoperate, including across major versions of Starbeam.
- [@starbeam/runtime]: Runtime coordination for Starbeam adapters and library
  implementors.
- [@starbeam/tags]: The core of Starbeam's demand-driven validation system for
  primitive and renderer implementors.
- [@starbeam/interfaces]: Type-only protocol substrate for Starbeam packages and
  implementors.
- [@starbeam/reactive]: The implementation of Starbeam's fundamental reactive
  values (cells and formulas).
- [@starbeam/collections]: Starbeam's reactive collections: reactive
  implementations of JavaScript's built-in collections (object, array,
  `Map`, `Set`, `WeakMap`, and `WeakSet`).

More READMEs are coming.

[@starbeam/shared]: ./packages/universal/shared/README.md
[@starbeam/runtime]: ./packages/universal/runtime/README.md
[@starbeam/tags]: ./packages/universal/tags/README.md
[@starbeam/interfaces]: ./packages/universal/interfaces/README.md
[@starbeam/reactive]: ./packages/universal/reactive/README.md
[@starbeam/collections]: ./packages/universal/collections/README.md
