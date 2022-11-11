## Inability to easily use a record as an extends bound

TBD:

```ts
function X<T extends Record<string, unknown>>(t: T) {
  return t;
}

X({ a: 1, b: 2 });
//
```

## History

[2022-10-25 to 2022-11-4](https://gist.github.com/wycats/f8d86917ca53dbe80fcf2b25f59e351f)
