# Resources

At a basic level, resources are two-layer formulas:

- A constructor formula that sets up the resource's instance (and registers
  cleanup). The instance can (and usually does) have reactive state.
- An reactive instance that depends on the instance's state, and possibly other
  reactive state.

This design creates a distinction between construction and instance
dependencies, which is critical for making the resource work.

```ts
const Stopwatch = Resource(({ on }) => {
  const now = Cell(Date.now());

  const timer = setInterval(() => {
    now.set(Date.now());
  }, 1000);

  on.cleanup(() => {
    clearInterval(timer);
  });

  return Formula(() => {
    return new Intl.DateTimeFormat().format(now.current);
  });
});
```

In this case, the construction formula has no reactive dependencies, but the
instance formula depends on the `now` cell.

Let's see what would happen if you tried to model this as a single formula:

```ts
const now = Cell(Date.now());
let timer: number;

const Stopwatch = Formula(() => {
  if (timer) clearInterval(timer);

  timer = setInterval(() => {
    now.set(Date.now());
  }, 1000);

  return new Intl.DateTimeFormat().format(now.current);
});
```

Since the code that sets up the interval and the code that uses it is inside the
same formula, the formula invalidates every time the interval ticks, and the
interval will be cleaned up and recreated on every tick. Definitely not what we
wanted!

### Reactive Instance

The second formula does not need to be a reactive value. For example, it could
be an instance of an object that stores a cell and exposes reactive getters:

```ts
const Stopwatch = Resource(({ on }) => {
  const now = Cell(Date.now());

  const timer = setInterval(() => {
    now.set(Date.now());
  }, 1000);

  on.cleanup(() => {
    clearInterval(timer);
  });

  return {
    get now() {
      return new Intl.DateTimeFormat().format(now.current);
    },
  };
});
```

Instances of `Stopwatch` are methods with a reactive `now` property which will
change when the interval ticks.

## Resource Runs

A resource _instance_ is a long-lived reactive value that exists until the
resource is finalized. A resource instance has a number of _resource runs_ over
its lifetime.

A resource is a reactive value that evaluates to its _current value_.

### Evaluating the Constructor

The steps for evaluating the constructor are:

1. Evaluate the resource's constructor formula. Evaluating the formula:

   1. Collects the run's reactive dependencies.
   2. Collects a list of the run's cleanup functions.
   3. Links any resources created within the run to the run's lifetime. If the
      same resource instance was used in a previous run, this _adopts_ the
      resource.

2. Run finalizers for the previous resource run.
   1. Run its cleanup functions.
   2. Finalize any child resources that were not adopted by the new run.

## Evaluating a Resource

A resource's dependencies are the combination of:

- The dependencies of the resource's instance formula.
- The dependencies of the current resource run (its constructor).

This means that a resource will invalidate if its instance formula invalidates
_or_ if its constructor invalidates.

Evaluating a resource:

1. Validate the resource run. If the resource run is invalid, [evaluate the
   constructor](#evaluating-the-constructor).
2. Evaluate the resource's instance formula.

## Composing Resources

The `use` method makes it possible for a resource to instantiate other
resources within the lifetime of the parent resource.

There are several aspects of the design that make it easier to compose
resources.

### Using a Resource Constructor

```ts
const Channel = Resource(({ use }) => {
  const socket = use(Socket);
});
```

In this case, the Socket constructor is evaluated during `Channel`'s
constructor, and its instance is linked to the current run. Whenever the current
run is finalized, the Socket instance is finalized as well.

### Reusing a Resource

```ts
const socket = Socket.create({ within: owner });

const Channel = Resource(({ use }) => {
  const socket = use(socket);
});
```

In this case, `socket`'s lifetime is linked to the current run. Whenever the current
run is finalized, the Socket instance is finalized as well _unless_ it was
adopted by the next run.

> `ResourceList` uses this feature to dynamically create child resources that are
> automatically cleaned up when they aren't used anymore.

## Resource Metadata

A resource can also have instance metadata that lasts for the entire lifetime of
the resource. This metadata can be used for state that persists across runs.
