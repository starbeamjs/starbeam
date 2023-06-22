import { useReactive, useResource } from "@starbeam/react";
import { Cell, Resource } from "@starbeam/universal";
import { useId, useState } from "react";

export default function App(): JSX.Element {
  const [start, setStart] = useState(0);
  const startId = useId();

  return (
    <>
      <label htmlFor={startId}>Start</label>
      <input
        id={startId}
        type="number"
        defaultValue={start}
        onInput={(e) => void setStart(e.currentTarget.valueAsNumber)}
      />
      <HelloCounter start={start} />
      <HelloCounter start={start} />
      <HelloCounter start={start} />
    </>
  );
}

function HelloCounter({ start }: { start: number }): JSX.Element {
  const counter = useResource(Counter);

  return useReactive(() => {
    return (
      <>
        <h1>{counter.current + start}</h1>
        <button onClick={counter.increment}>Increment</button>
      </>
    );
  }, [start]);
}

const Counter = Resource(() => {
  const cell = Cell(0);

  return {
    get current() {
      return cell.current;
    },

    increment() {
      cell.current++;
    },
  };
});
