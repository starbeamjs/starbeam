import { reactive } from "@starbeam/core";
import { Formula } from "@starbeam/reactive";

//***********//
//** CELLS **//
//***********//

// create a cell whose value is an array of numbers ([1, 2, 3])
const numbers = reactive([1, 2, 3]);

//**************//
//** FORMULAS **//
//**************//

// create a formula that sums up the numbers by looping over them and adding
// them up.
const sum = Formula(() => {
  let sum = 0;

  for (const number of numbers) {
    sum += number;
  }

  return sum;
});

// create a second formula that turns the array of numbers into a
// comma-separated string
const stringified = Formula(() => numbers.join(","));

//**************//
//** LET'S GO **//
//**************//

// the current value of the `stringified` formula is 1,2,3
stringified.current; // 1,2,3

// and the current value of the `sum` formula is 6, which is the sum of 1, 2,
// and 3.
sum.current; // 6

// So far so good. Now let's use the push method on JavaScript Array to add a
// new number to the `numbers` list.
numbers.push(4);

// the current value of `stringified` is up to date with the new number
stringified.current; // 1,2,3,4
// the current value of `sum` is 10, which is the sum of 1, 2, 3 and the value
// we just added to the list: 4.
sum.current; // 10

// Next, we'll update the first element of the Array (index `0`) with the number
// 10. We're replacing the original `1` with `10`.
numbers[0] = 10;

// the curent value of the `stringified` formula is `"10,2,3,4"`, because the
// `1` in the original list was updated.
stringified.current; // 10,2,3,4
// and the value of the sum formula is `19`, which is the sum of our new
// numbers: 10, 2, 3, and 4.
sum.current; // 19
