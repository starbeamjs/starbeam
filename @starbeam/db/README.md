The purpose of @starbeam/db is to provide a reactive table-like data structure.

It has a number of features that take advantage of its reactive nature:

- Queries represented as Starbeam formulas that operate on the local data. Query results are cached and updated as the data changes, just like other formulas.
- A primitive Row Reference type, which can be used to reference a single row. Row reference can be used naturally in queries, and the formula will update as the data accessed from that row changes.
- Drafts, which are a way to create new rows in the data or update existing rows. Manipulating a draft does not affect the data, so queries against the data do not update until the draft is committed.
- Indexes, which can be defined on tables or rows, and map rows to values that can be used in queries. For example, a table with a column called "city" can be indexed by city, and a query can be run against the index to find all rows in a given city. Unlike traditional database indexes, indexes in @starbeam/db are reactive, which means that they are updated as the data changes.
