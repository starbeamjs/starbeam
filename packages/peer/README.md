This package provides an extremely stable API for getting:

- The current timestamp as a number
- The value of the `UNINITIALIZED` symbol

Apps shouldn't use the exports of this dependency directly. Instead, installing it as a peer
dependency allows two versions of Starbeam to coexist in the same process and **to share reactivity
between them**.

In other words, if you access a Cell from version 1 of Starbeam in the context of a formula
created in version 2 of Starbeam, updating the cell will invalidate the formula.
