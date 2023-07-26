# Resources

A resource is a reactive constructor function with support for cleanup.

```ts
import { Resource, use } from "@starbeam/resource";
import { LIFETIME } from "@starbeam/runtime";

const Stopwatch = Resource(({ on }) => {
  const now = Cell(Date.now());

  on.setup(() => {
    const timer = setInterval(() => {
      now.set(Date.now());
    }, 1000);

    on.cleanup(() => {
      clearInterval(timer);
    });
  });

  return Formula(() => {
    return new Intl.DateTimeFormat().format(now.current);
  });
});

const lifetime = {};
const stopwatch = use(Stopwatch, { within: lifetime });

// later, when the lifetime is finalized...
LIFETIME.finalize(lifetime);
// the timer is cleared and `stopwatch` will stop updating
```

The `Resource` function takes a _resource constructor_ function and returns a
_resource blueprint_. A resource blueprint is instantiated with a _lifetime_ and
returns a _resource instance_.

The resource constructor function is called with a _resource run_ object that
allows the resource constructor to register cleanup functions and create child
resources.

The return value of the resource constructor is called the resource's _instance
value_.

In this case, the resource instance (`stopwatch`) is a reactive value that
evaluates to the current time, formatted using `Intl.DateTimeFormat`.

## Terms

<dl>
  <dt>resource blueprint</dt>
  <dd>The resource blueprint is instantiated with the `use` function and returns a <em>resource instance</em></dd>
  <dt>resource instance</dt>
  <dd>An instance of a resource blueprint is called its <em>resource instance</em>.</dd>
  <dt>instance value</dt>
  <dd>The value returned by the resource constructor is called the <em>instance value</em>.</dd>
  <dt>resource constructor</dt>
  <dd>The function passed to the <code>Resource</code> function is called the <em>resource constructor</em>.</dd>
  <dt>resource run</dt>
  <dd>Each time the resource constructor runs for a given resource instance, it is called a <em>resource run</em>. The constructor is called with an instance of the resource run, which allows the constructor to register cleanup functions and create child resources.</dd>
</dl>

## Assimilation

A resource instance is always a stable reactive value. Its current value is the
most recent return value of its resource constructor.

If a resource constructor returns a reactive value, the resource instance will
_assimilate_ that value. This means that the evaluated value of the resource
instance will be the same as the evaluated value of the returned reactive value.

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

In this case, the _resource run_ has no reactive dependencies, but the
_instance value_ is a formulaa that depends on the `now` cell.

This means that instances of `Stopwatch` will be reactive values that evaluate
to the current time, formatted using `Intl.DateTimeFormat`, but the resource
constructor will only be evaluated once.

### Regular Formulas Wouldn't Work

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

## Resource Metadata

In addition to state that's associated with each resource run, a resource can
have metadata that is shared across all resource runs.

```ts
interface CounterMetadata {
  interval: Reactive<number>;
  count: number;
}

const Counter = Resource(({ on }, { metadata }: CounterMetadata)) => {
  const count = Cell(metadata.count);

  const interval = setInterval(() => {
    count.set(++metadata.count);
  }, metadata.interval.current);

  on.cleanup(() => {
    clearInterval(interval);
  });

  return count;
};
```

When a resource has metadata, the initial value of the metadata is passed to the
`use` function as the second argument:

```ts
const interval = Cell(1000);
const counter = use(Counter, {
  within: lifetime,
  metadata: {
    interval,
    count: 0,
  },
});
```

Now, whenever the `interval` cell changes, the resource constructor will be
re-evaluated, but the `count` will be preserved.

> In general, it's a good idea to avoid trying to maintain state across resource
> runs. It's sometimes necessary, but it maakes it possible to create resources
> with incoherent values, so you should try to think of an alternative if
> possible.

## Semantics Summary

1. A resource blueprint is instantiated with a _lifetime_ and returns a
   _resource instance_.
2. When a resource run is evaluated:
   1. The previous resource run, if it exists, is finalized.
   2. Its constructor is evaluated as a formula, and its dependencies are the
      dependencies of that formula.
3. When a resource instance's lifetime is finalized:
   1. Its current resource run is finalized.
   2. Any instance finalizers are run.
4. Whenever a resource instance is evaluated (i.e. its value is read):
   1. Its current resource run is validated.
      1. If it is invalid, a new resource run is created and the resource's
         constructor is evaluated.
   2. If the instance value is a reactive value, the resource instance
      is evaluated to the current value of that reactive value.

### Instance Value

While assimilation is often useful, a resource's instance value does not
**need** to be a reactive value. For example, it could be an instance of an
object that stores a cell and exposes reactive getters:

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

## Resource Runs in More Detail

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

### Creating a Child Resource With `use`

```ts
const Channel = Resource(({ use }) => {
  const socket = use(Socket);
});
```

In this case, the Socket constructor is evaluated during `Channel`'s
constructor, and its instance is linked to the current run. Whenever the current
run is finalized, the Socket instance is finalized as well.

This `use` works just like the imported `use` function, except that you don't
specify a lifetime. Instead, the lifetime is the current resource run.

### Reusing a Resource

```ts
const socket = use(Socket, { within: owner });

const Channel = Resource(({ use }) => {
  const socket = use(socket);
});
```

In this case, `socket`'s lifetime is linked to the current run. Whenever the
current run is finalized, the Socket instance is finalized as well _unless_ it
was adopted by the next run.

> `ResourceList` uses this feature to dynamically create child resources that are
> automatically cleaned up when they aren't used anymore.
