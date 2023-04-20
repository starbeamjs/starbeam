# Starbeam Collections

Starbeam collections are reactive implementations of JavaScript built-in
collections.

- [Object]
- [Array]
- [Map]
- [Set]
- [WeakMap]
- [WeakSet]

Starbeam collections behave identically to the JavaScript built-ins that they
implement.

> 📢 Starbeam Collections do not support prototype mutation. This is the only known
> divergence from the JavaScript APIs.

Internally, Starbeam collections model JavaScript read operations in one of
three ways:

- key accesses, which check whether a key is a member of the collection.
- value accesses, which access and return a value from the collection.
- key iterations, which iterate over a collection's keys.
- value iterations, which iterate over a collection's values.

## Example

For example, in the `Map` API:

- `has(key)` is a **key access**.
- `get(key)` is an **value access**.
- `keys()` is a **key iteration**.
- `values()` is a **value iteration**.
- `entries()` is a **key and value iteration**.
- iterating the map via `Symbol.iterator` or `forEach` is a **key and value
  iteration**.

Consider this formula:

```ts
const recipes = reactive.Map(["pie", "http://example.com/pie-recipe"]);
const hasTastyFood = Formula(() => food.has("pie") || food.has("cookie"));
```

This formula makes two _key accesses_: `"pie"` and `"cookie"`.

If the URL for `pie` is updated:

```ts
recipes.set("pie", "http://example.com/better-pie-recipe");
```

This formula updates the _value_ of `"pie"`, but the _key_ has not changed. The
`hasTastyFood` formula **will not invalidate**.

Categorizing operations this way supports the intuition that `hasTastyFood` has
not changed by providing enough granularity to capture the user's intent.

## Iteration

If a formula iterates over a reactive collection, the formula will invalidate
when the collection changes.

Replacing an existing value will invalidate a _value iteration_ but not a _key
iteration_. Adding a new entry or deleting an existing entry will invalidate
both.

Let's create a couple of new formulas in our recipe example:

```ts
const recipeCount = Formula(() => recipes.size);
const uniqueRecipeURLs = Formula(
  () => new Set([...recipes.values()].map((r) => r.url))
);
```

The `recipeCount` formula only changes when the _key iteration_ is invalidated.

So let's say we update the pie recipe again:

```ts
recipes.set("pie", "http://example.com/even-better-pie-recipe");
```

Since changing the value of an existing entry doesn't invalidate the _key
iteration_, the `recipeCount` formula **will not invalidate**.

However, the `uniqueRecipeURLs` formula **will invalidate** when the
collection changes.

Intuitively, this behaves just as we'd expect: changing the value of a recipe
doesn't change the size of the recipes collection. But it _might_ change the
number of unique URLs.

## 📢 Invalidation

Starbeam collections have predictable, granular invalidation rules. They
cannot, however, avoid invalidating a formula just because the formula
ultimately produces the same answer.

In this example, it's possible to invalidate `uniqueRecipeURLs` by changing
the value of a recipe URL from a URL that has other existing entries to a URL
that also has existing entries.

In this situation, computing the formula will ultimately determine that
nothing has changed. However, Starbeam invalidation rules are based upon the
invalidation of storage cells, and **never** rely upon comparing the value of
a previous computation with the value of a new computation.

In practice, this means that renderers may want to compare the new value to
the old value in order to determine whether to do the work of updating the
rendererd output.

[Object]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object
[Array]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array
[Map]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
[Set]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set
[WeakMap]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap
[WeakSet]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakSet
