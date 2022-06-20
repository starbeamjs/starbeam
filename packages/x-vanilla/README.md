## Aggregating and Grouping

**Grouping** turns a list of rows into a map of lists of rows based on some grouping criteria.

```ts
const people = Table.define<Person>({ columns: ["name", "location"] });

people.append({ name: "John", location: "Berlin" });
people.append({ name: "Jane", location: "London" });
people.append({ name: "Jill", location: "Berlin" });

const byLocation = people.groupBy({
  group: (row) => row.location,
});

byLocation.get("Berlin").length; // 2
byLocation.get("London").length; // 1

byLocation.get("Berlin").rows;
// [
//  { name: "John", location: "Berlin" },
//  { name: "Jill", location: "Berlin" }
// ]
```

**Aggregating** turns a list of rows into a smaller list of rows where some of the columns have been aggregated.

```ts
const transactions = Table.define<Transaction>({
  columns: ["amount", "type", "category", "date"],
});

transactions.append({
  amount: 100,
  type: "expense",
  category: "food",
  date: "2022-01-01",
});
transactions.append({
  amount: 200,
  type: "expense",
  category: "food",
  date: "2022-02-12",
});
transactions.append({
  amount: 50,
  type: "expense",
  category: "gas",
  date: "2022-02-07",
});
transactions.append({
  amount: -100,
  type: "refund",
  category: "food",
  date: "2022-02-10",
});
transactions.append({
  amount: 400,
  type: "income",
  category: "paycheck",
  date: "2022-02-14",
});

const byMonth = transactions.groupBy({
  group: (row) => row.date.substring(0, 7),
});

byMonth.groups;
// Map<{
//   "2022-01": [
//    { amount: 100, type: "expense", category: "food", date: "2022-01-01" },
//   ],
//   "2022-02": [
//     { amount: 200, type: "expense", category: "food", date: "2022-02-12" },
//     { amount: 50, type: "expense", category: "gas", date: "2022-02-07" },
//     { amount: -100, type: "refund", category: "food", date: "2022-02-10" },
//     { amount: 200, type: "expense", category: "food", date: "2022-02-12" },
//     { amount: 400, type: "income", category: "paycheck", date: "2022-02-14" },
//   ],
// }>

byMonth.rows({ group: "month" });

const byCategory = byMonth.groupBy({
  group: (row) => row.category,
});

byCategory.groups;
// Map<{
//   "2022-01": Map<{
//     "food": [
//      { amount: 100, type: "expense", category: "food", date: "2022-01-01" },
//     ],
//   }>,
//   "2022-02": Map<{
//     "food": [
//      { amount: 200, type: "expense", category: "food", date: "2022-02-12" },
//      { amount: -100, type: "refund", category: "food", date: "2022-02-10" },
//     ],
//     "gas": [
//      { amount: 50, type: "expense", category: "gas", date: "2022-02-07" },
//     ],
//     "paycheck": [
//      { amount: 400, type: "income", category: "paycheck", date: "2022-02-14" },
//     ],
//   }>,
// }>

const SumAggregator = {
  aggregate: (rows) => rows.reduce((acc, row) => acc + row.amount, 0),
  description: (column) => `${column} (sum)`,
};

const byMonthExpenses = byMonth
  .groupBy({ group: (row) => row.category })
  .omit("type")
  .aggregate({
    amount: SumAggregator,
  });

byMonthExpenses.rows;
// Map<{
//   "2022-01": [
//     { category: "food", amount: 100 },
//   ],
//   "2022-02": [
//     { category: "food", amount: 100 },
//     { category: "gas", amount: 50 },
//     { category: "paycheck", amount: 400 },
//   ],
// }>
```
