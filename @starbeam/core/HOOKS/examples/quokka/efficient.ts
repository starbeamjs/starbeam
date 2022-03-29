import { formula, reactive } from "@starbeam/core";

//********** CELLS **********//

const person = reactive({
  name: "Chirag",
  company: "LinkedIn",
  project: "Starbeam",
});

//********* FORMULAS ********//

// The `personCard` formula creates a description of `person` by combining their
// name and company.
const personCard = formula(() => `${person.name} (${person.company})`);

// The `personProject` formula creates a description of `person` by combining
// their name and current project.
const personProject = formula(() => `${person.name} (${person.project})`);

//********* LET'S GO ********//

personCard.current; // "Chirag (LinkedIn)"

/**
 * At the moment, the `personCard` formula depends on two data cells:
 *
 * - `person`'s name
 * - `person`'s company
 */

personProject.current; // "Chirag (Starbeam)"

/**
 * At the moment, the `personProject` formula depends on two data cells:
 *
 * - `person`'s name
 * - `person`'s project
 */

person.project = "Starbeam Web";

// Because the `personCard` formula currently does *not* depend on `person`'s
// project property, Starbeam returns the value it computed last time.
personCard.current; // "Chirag (LinkedIn)"

// On the other hand, since the `personProject` formula currently *does* depend
// on `person`'s project property, Starbeam recomputes the value (and updates
// the formula's dependencies).
personProject.current; // "Chirag (Starbeam Web)"

person.name = "Chirag Patel";

// This time, because both the `personCard` and `personProject` formulas
// depended on `person`'s name property, they are not up to date, and Starbeam
// recomputes them.
personCard.current; // "Chirag Patel (LinkedIn)"
