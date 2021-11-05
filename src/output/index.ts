export * from "./text";

// type Boolean =
//   | { variant: "true"; value: true }
//   | { variant: "false"; value: false };

// function x(takes: Boolean) {
//   if (takes.variant === "true") {
//     takes.value;
//   }
// }

// type Variants = {
//   [P in keyof any]: unknown;
// };

// class Variant<R extends Variants> {
//   match<T>(dictionary: { [P in keyof R]: (value: R[P]) => T }): T {
//     throw "unimplemented";
//   }
// }

// declare let x: Variant<{ true: true; false: false }>;

// let v = x.match({
//   true: (value) => `${value}`,
//   false: (value) => `${value}`,
// });
