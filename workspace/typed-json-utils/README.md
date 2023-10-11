# typed-json-utils

[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)

Utilities for working with JSON values in a typesafe way

This package provides facilities for working with JSON values in a typesafe way.

> A "JSON value" is a value that could be produced by `JSON.parse`:
>
> - strings
> - numbers
> - booleans
> - null
> - objects whose keys are strings and whose values are JSON values
> - arrays whose values are JSON values

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [Maintainers](#maintainers)
- [Contributing](#contributing)
- [License](#license)

## Install

```sh
$ npm install typed-json-utils
```

## Usage

```ts
import { isArray, isObject, isPrimitive } from "typed-json-utils";

console.log(isArray([1, 2, 3])); // true
console.log(isObject({ a: 1, b: 2, c: 3 })); // true

// isObject refers to a *JSON* object, and therefore does not return
// true for arrays.
console.log(isObject([1, 2, 3])); // false

console.log(isPrimitive(3, Number)); // true
console.log(isPrimitive(3, String)); // false
```

You can use these utilities to narrow down types.

```ts
import {
  isArray,
  isObject,
  isPrimitive,
  type JsonValue,
} from "typed-json-utils";

export function stringify(value: JsonValue): string {
  if (value === null) {
    return "null";
  }

  if (isPrimitive(value)) {
    // value is string, number, boolean or undefined
    return JSON.stringify(value);
  }

  if (isArray(value)) {
    // value is JsonArray
    return `[${value.map(stringify).join(", ")}]`;
  }

  if (isObject(value)) {
    // value is JsonObject
    return `{${Object.entries(value)
      .map(([key, value]) => {
        // key is string, value is JsonValue
        return `${key}: ${stringify(value)}`;
      })
      .join(", ")}}`;
  }

  // value is never
}
```

## API

> 🚧 TODO before release

## Maintainers

[@wycats](https://github.com/wycats), [@nullvoxpopuli](https://github.com/nullvoxpopuli)

## Contributing

PRs accepted.

Small note: If editing the README, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## License

MIT © 2023 Yehuda Katz
