import { expected } from "../verify.js";

export function isOneOf<In, Out extends In>(
  ...verifiers: ((value: In) => value is Out)[]
): (value: In) => value is Out {
  function verify(input: In): input is Out {
    for (const verifier of verifiers) {
      if (verifier(input)) {
        return true;
      }
    }

    return false;
  }

  const expectation = expected.updated(verify, {
    to: (to) => {
      if (to === undefined) {
        return ["to be one of", "any"];
      } else {
        return `${to[1]} or any`;
      }
    },
    actual: (actual) => {
      return (input: In) => {
        if (actual) {
          return actual(input);
        }
      };
    },
  });

  return expected.associate(verify, expectation);
}
