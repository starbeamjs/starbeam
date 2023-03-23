In the public `TIMELINE` API, you can subscribe to changes to any reactive.

Internally, Starbeam has a direct mapping from cells to notifications.

Whenever a formula is recomputed, it gets a new set of cell dependencies. The formula's
subscriptions are removed from any cells that are no longer dependencies, and added to any
cells that became dependencies.

```ts
const shouldDisplay = Cell(false);
const name = Cell("Tom");

const user = Formula(() => {
  if (shouldDisplay.current) {
    return name.current;
  } else {
    return "";
  }
});

user.current; // ""

TIMELINE.on.change(user, () => console.log("user changed"));
```

At this point, the `user` formula has `shouldDisplay` as a dependency. This means that Starbeam has
a mapping from `shouldDisplay` to `() => console.log("user changed")` (the notification).

If this happens:

```ts
name.current = "Thomas";
```

The notification will not fire, since there's no mapping from `name` to the notification.

If this happens:

```ts
shouldDisplay.current = true;
```

The notification _will_ fire, since there's a mapping from `shouldDisplay` to the notification.

At this point, the `user` formula hasn't yet been recomputed, so the mapping hasn't changed either.

That means that if you do this:

```ts
user.current = "Tomas";
```

The notification will _not_ fire again.

In real-world scenarios, the notification will cause the formula to be recomputed at some later
point. After _that_ happens:

```ts
someElement.textContent = user.current; // "Tomas"
```

At _this_ point, there's a mapping from _both_ `shouldDisplay` _and_ `name` to the notification.

You may be surprised that we don't need another notification, simply because the formula wasn't
recomputed.

---

The **TL;DR** is that notifications inform you that a reactive value has changed since the last time
it was computed (they are not a general-purpose pub-sub mechanism).

---

The slightly longer version is: After the first notification, Starbeam has _already_ notified you
that the formula needs to be recomputed, and you scheduled some code to run later that will
recompute the formula and do something with the new value.

At this point, you already know that you need to recompute the formula, but you haven't actually
computed the value yet. If more changes to reactive dependencies happen before you recompute the
value, nothing changes about that.

When you finally _do_ recompute the value, you get a value that is guaranteed to be up to date. You
didn't need to recompute the value in between (and learn about the change to dependencies) to get
the right behavior.
