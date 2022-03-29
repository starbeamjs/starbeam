import { formula, reactive } from "@starbeam/core";

//***************//
//** FUNCTIONS **//
//***************//

// A simple function that takes a name and company and returns a cell whose
// value is a reactive object with name and company properties.
function person(
  name: string,
  company: string
): { name: string; company: string } {
  return reactive({ name, company });
}

//***********//
//** CELLS **//
//***********//

// The `people` cell contains a reactive array of `person` objects.
const people = reactive([
  person("Chirag Patel", "LinkedIn"),
  person("Tom Dale", "LinkedIn"),
  person("Yehuda Katz", "Tilde"),
]);

//**************//
//** FORMULAS **//
//**************//

// The `companies` formula creates a unique `Set` of companies from the list of
// people in the `people` cell.
const companies = formula(
  () => new Set(people.map((person) => person.company))
);

// At the moment, the `companies` formula now depends on three data cells:
//
// - Chirag's `company` property
// - Tom's `company` property
// - Yehuda's `company` property

// The `commaSeparatedPeople` formula turns the list of people in the `people`
// cell into a comma-separated list of each person's name.
const commaSeparatedPeople = formula(() =>
  people.map((person) => person.name).join(", ")
);

// At the moment, the `commaSeparatedPeople` formula depends on three data cells:
//
// - Chirag's `name` property
// - Tom's `name` property
// - Yehuda's `name` property

companies.current; // `companies` = Set { 'LinkedIn', 'Tilde' }

commaSeparatedPeople.current; // `commaSeparatedPeople` = "Chirag Patel, Tom Dale, Yehuda Katz"

// Update the name of the second element of the `people` array with a new name.
people[1].name = "Thomas Dale";

// We updated the `name` property of the second element of the `people` array,
// but the `companies` formula didn't depend on that property. As a result,
// Starbeam simply returns the value it computed last time.
companies.current; // Set { 'LinkedIn', 'Tilde' }

// On the other hand, the `commaSeparatedPeople` formula *did* depend on that
// property. As a result, Starbeam recomputes the value and updates the
// formula's dependencies.
commaSeparatedPeople.current; // "Chirag Patel, Thomas Dale, Yehuda Katz"
