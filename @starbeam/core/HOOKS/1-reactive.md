Starbeam is a **reactivity system** for **web applications** that is
**internally coherent** and provides a structured way of interacting with
external sources of data and affecting the external environment.

## What is Reactive Data?

You can think of Reactive data in Starbeam like cells in an Excel spreadsheet.

There are two kinds of cells in Starbeam:

- **Data**: An editable cell that you can update with new data
- **Formula**: A cell that _derives_ its value from other data or formula cells.

Let's take a quick look at the system in action.

%EXAMPLE: ./examples/quokka/excel.ts%

### Starbeam is Efficient!

You might be wondering: does Starbeam re-run the formulas every time we ask for
their value?

Nope, and this is part of what makes Starbeam's reactivity so amazing.

When you ask for the value of a formula, Starbeam automatically keeps track of
which data cells were used in the formula. If those data cells didn't change and
you ask for the value of the formula again, Starbeam returns the value it
computed last time.

<details>
  <summary>Code Example</summary>

%EXAMPLE: ./examples/quokka/efficient.ts%

</details>
