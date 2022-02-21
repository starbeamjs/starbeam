import { todo } from "../support/define.js";
todo("choice.spec.ts");
// import { Cases } from "@starbeam/core";
// import { todo } from "../support/define";
// import { expect, test, toBe } from "../support/index.js";
// function StringType(value: unknown): value is string {
//   return typeof value === "string";
// }
// const BooleanChoice = Cases("Boolean", (c) => c.add("true").add("false"));
// const OptionalString = Cases("Optional", (c) =>
//   c.add("Some", StringType).add("None")
// );
// todo("choice (unit, static)", ({ universe: timeline }) => {
//   let truth = timeline.static(BooleanChoice("true"));
//   let value = timeline.match(truth, {
//     true: () => "YES",
//     false: () => "NO",
//   });
//   expect(value.current, toBe("YES"));
// });
// todo("choice (unit, dynamic)", ({ universe: timeline }) => {
//   let bool = timeline.cell(BooleanChoice("true"));
//   let value = timeline.match(bool, {
//     true: () => "YES",
//     false: () => "NO",
//   });
//   expect(value.current, toBe("YES"));
//   bool.update(BooleanChoice("false"));
//   expect(value.current, toBe("NO"));
// });
// todo("choice (tuple, static)", ({ universe }) => {
//   let name = universe.static(OptionalString("Some", universe.static("Tom")));
//   let value = universe.match(name, {
//     Some: (name) => name.toUpperCase(),
//     None: () => "anonymous",
//   });
//   expect(value.current, toBe("TOM"));
// });
// todo("choice (unit, dynamic top-level)", ({ universe: timeline }) => {
//   let name = timeline.cell(OptionalString("Some", timeline.static("Tom")));
//   let value = timeline.match(name, {
//     Some: (name) => name.toUpperCase(),
//     None: () => "anonymous",
//   });
//   expect(value.current, toBe("TOM"));
//   name.update(OptionalString("None"));
//   expect(value.current, toBe("anonymous"));
// });
// todo("choice (unit, dynamic)", ({ universe: timeline }) => {
//   let name = timeline.cell("Tom");
//   let optionalName = timeline.cell(OptionalString("Some", name));
//   let value = timeline.match(optionalName, {
//     Some: (name) => name.toUpperCase(),
//     None: () => "anonymous",
//   });
//   expect(value.current, toBe("TOM"));
//   name.update("Thomas");
//   expect(value.current, toBe("THOMAS"));
//   optionalName.update(OptionalString("None"));
//   expect(value.current, toBe("anonymous"));
// });
//# sourceMappingURL=choice.spec.js.map