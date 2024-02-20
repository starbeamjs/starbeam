A subscription is a weak mapping from individual cells to the subscriptions that
depend on them. This is an interesting problem because consumers can subscribe
to reactive values whose cell depenencies change over time (such as formulas).
We want:

1. A direct mapping from cells to subscribers. This means that we know
   (directly) what subscribers are interested in a cell mutation, allowing us to
   do synchronous bookkeeping related to subscribers as mutations occur.
2. A weak mapping from cells to subscribers. If a cell is GC'ed, then no
   additional mutations to it can occur, and we don't need to maintain a hard
   reference to the cell or its subscribers. We accomplish this by keeping a
   weak mapping from formulas to subscriptions, and a second weak mapping from
   cells to subscriptions. When a cell is mutated, we have a direct mapping to
   the subscriber without additional computations. When a formula is recomputed,
   we:
3. get its subscriptions from the mapping.
4. remove the subscriptions from any cells that are no longer dependencies.
5. add the subscriptions to any cells that are now dependencies.

This makes reading formulas a bit slower, but simplifies cell mutation. This
is a good trade-off, since formula computation is typically scheduled, and
happens in response to potentially many mutations. See [A detailed
description of the approach used here](./subscriptions.md)
