# Resource Lifecycle

## A Resource Blueprint

```ts
const Stopwatch = Resource(({ on }) => {
  const now = Cell(Date.now());

  on.setup(() => {
    const timer = setInterval(() => {
      now.set(Date.now());
    });

    return () => {
      clearInterval(timer);
    };
  });

  return now;
});

const FormattedNow = Resource.withArgs((locale: Reactive<string>) => {
  const now = use(Stopwatch);
  const formatter = CachedFormula(
    () => new Intl.DateTimeFormat(locale.current)
  );

  return Formula(() => formatter().format(now()));
});
```
