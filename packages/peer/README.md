This package provides an extremely stable API for getting:

- The current timestamp as a number
- The value of the `UNINITIALIZED` symbol

Apps shouldn't use the exports of this dependency directly. Instead, separating the most fundamental
parts of Starbeam's composition into a separate package allows two versions of Starbeam to coexist
in the same process and **to share reactivity between them**.

In other words, if you access a Cell from version 1 of Starbeam in the context of a formula
created in version 2 of Starbeam, updating the cell will invalidate the formula.

This package uses `Symbol.for` to ensure that only a single copy of the fundamental symbols and
constants exists in a single process. As a result, it is not necessary to install this package as a
peer dependency.
