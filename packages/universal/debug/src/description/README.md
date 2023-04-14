> This document is outdaated but reflects some early thinking about the
> description architecture. It's still useful as a way to drive future design
> work, and should be updated as the design evolves.

# The Description Architecture

The goal of the description architecture is to provide a way to describe reactive operations in a way that is both human readable and easy to use in a debug tool.

- [Reactive Scalars](#reactive-scalars)
- [Formulas](#formulas)
- [Collections](#collections)

## Validation Descriptions

A validation description allows debugging tools to determine whether a reactive value is still valid.

### Timestamp Validation

<dl>
  <dt>kind</dt>
  <dd><code>timestamp</code></dd>
  <dt>timestamp</dt>
  <dd><em>(Timestamp)</em> The timestamp represented by the validator. <em>The timestamp is possibly computed.</em></dd>
  <dt>isValid()</dt>
  <dd>A function that returns <code>true</code> if the validator is still valid, or <code>false</code> otherwise.</dd>
</dl>

### Digest Validation

A digest validator represents a rule for converting a value into a (string) digest. Digesting **inputs** can therefore be used to determine whether an **output value** has changed without computing it.

> **Note:** Starbeam does not currently expose any APIs that use digest validation, but it is contemplated for the future.

<dl>
  <dt>kind</dt>
  <dd><code>digest</code></dd>
  <dt>digest</dt>
  <dd><em>(string)</em> The digest represented by the validator. <em>The digest is possibly computed.</em></dd>
  <dt>isValid(current)</dt>
  <dd>A function that returns <code>true</code> if the validator is still valid, or <code>false</code> otherwise.</dd>
</dl>

## All Descriptions

All descriptions have:

<dl>
  <dt>name</dt>
  <dd>A user-specified name, or (in dev mode) a name inferred from the stack</dd>
  <dt>stack</dt>
  <dd><em>(in dev)</em> A stack frame in the user code that created the reactive value</dd>
  <dt>validator</dt>
  <dd><em>(lazy)</em> a validator description</dd>
</dl>

## Reactive Scalars

A reactive scalar represents a single value:

- Cells
- Formulas

### Cells

A cell is the fundamental reactive scalar value.

<dl>
  <dt>value</dt>
  <dd>The current value of the cell</dd>
  <dt>updated</dt>
  <dd>The timestamp at which the value was updated</dd>
</dl>

### Markers

A marker represents something that can change but whose value is not tracked by Starbeam. You can think of it as a cell whose value is an "updated-at" timestamp.

<dl>
  <dt>updated</dt>
  <dd>The timestamp at which the value was updated</dd>
</dl>

### Formulas

A Formula's description also includes:

  <dl>
    <dt>computed</dt>
    <dd>If the formula was not computed yet, <code>UNINITIALIZED</code>. Otherwise, <code>{ value, at }</code>. The <code>value</code> is the most recent computed value, and <code>at</code> is the timestamp at which the computation occurred.</dd>
    <dt>children</dt>
    <dd><em>(lazy)</em> A list of the reactive values that this formula directly depends on</dd>
    <dt>dependencies</dt>
    <dd><em>(lazy)</em> A flattened list of the mutable cells that this formula depends on</dd>
    <dt>updatedAt</dt>
    <dd><em>(computed)</em> The most recent timestamp in which any of the formula's dependencies have changed</dd>
  </dl>

## Collections

A reactive collection is a logical grouping of multiple reactive values, such as a list, map or set.

### Iterable Collections

<dl>
  <dt>entries</dt>
  <dd>a <code>Marker</code> that indicates the last time the iteration over entries changed.</dd>
</dl>

### Iterable Key-Value Collections

In addition to the properties in Iterable Collections:

<dl>
  <dt>keys</dt>
  <dd>a <code>Marker</code> that indicates the last time the iteration over keys changed. <em>If a key's value was replaced, this marker is not updated. If a key is added or deleted, this marker is updated.</em></dd>
  <dt>values</dt>
  <dd>a <code>Marker</code> that indicates the last time the iteration over values changed. <em>This is basically equivalent to <code>entries</code>, but if a collection has a way to atomically replace a key/value with another key and the same value, the <code>values</code> marker may not update.</em></dd>
</dl>

### Value Collections

<dl>
  <dt>has(value)</dt>
  <dl>A marker that updates whenever the response to <code>has(value)</code> would change. <em>If an entry was missing and then deleted, this marker doesn't update.</em></dl>
</dl>

### Key-Value Collections

<dl>
  <dt>has(key)</dt>
  <dl>A marker that updates whenever the response to <code>has(key)</code> would change. <em>If an entry was missing and then deleted, this marker doesn't update.</em></dl>
  <dt>get(key)</dt>
  <dl>A marker that updates whenever the response to <code>get(key)</code> would change. <em>If an entry was missing and then added, or added and then deleted, this will update (unless the value, when present was <code>undefined</code>).</em></dl>
</dl>

## Reactive Values

### Cells

A cell's description i

- **cell reads** are operations that read the current value of a cell.
- **cell writes** are operations that write a new value to a cell.

There are two kinds of fundamental reactive operations:

- **cell reads** are operations that read the current value of a reactive cell.
- **cell writes** are operations that change the value of a reactive cell.
- **iterations** are operations that iterate a reactive collection.
- **splices**

And two kinds of composite reactive operations:

- **formula reads** are operations that read a value from a formula
- **mutations** are operations that change multiple cells at once

## Cells

There are a few kinds of fundamental cells:

## Data Structure Operations
