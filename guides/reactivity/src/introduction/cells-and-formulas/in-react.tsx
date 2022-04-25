import { LiterCounter } from "#reactive/liter-counter";
import { use } from "@starbeam/react";

export function LiterLikeButton() {
  const liters = use(LiterCounter);

  return (
    <>
      <button onClick={() => liters.increment()}>Add a liter</button>
      <p>{liters.description}</p>
    </>
  );
}
