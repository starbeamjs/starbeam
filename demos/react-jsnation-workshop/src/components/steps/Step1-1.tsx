import { reactive } from "@starbeam/collections";
import { useReactive, useResource } from "@starbeam/react";
import { Resource } from "@starbeam/universal";
import { useId, useState } from "react";

export default function App(): JSX.Element {
  const [start, setStart] = useState(0);
  const counters = useResource(Counters);
  const startId = useId();

  return useReactive(() => {
    return (
      <>
        <label htmlFor={startId}>Start</label>
        <input
          id={startId}
          type="number"
          defaultValue={start}
          onChange={(e) => void setStart(e.currentTarget.valueAsNumber)}
        />
        <button onClick={() => void counters.add()}>Add Counter</button>
        {counters.list.map((counter) => {
          return (
            <div className="p-card" key={counter.id}>
              <HelloCounter
                start={start}
                counter={counter}
                remove={counters.remove}
              />
            </div>
          );
        })}
      </>
    );
  }, [start, setStart]);
}

function HelloCounter({
  start,
  counter,
  remove,
}: {
  start: number;
  counter: Counter;
  remove: (id: number) => void;
}): JSX.Element {
  return useReactive(() => {
    return (
      <>
        <h4>id: {counter.id}</h4>
        <p>
          <span className="p-chip">
            <span className="p-chip__value">counter</span>
            <span className="p-badge">{counter.count}</span>
          </span>
          <span className="p-chip--positive">
            <span className="p-chip__value">+</span>
          </span>
          <span className="p-chip">
            <span className="p-chip__value">start</span>
            <span className="p-badge">{start}</span>
          </span>
          <span className="p-chip--positive">
            <span className="p-chip__value">{"="}</span>
          </span>
          <span className="p-chip">
            <span className="p-chip__value">total</span>
            <span className="p-badge">{start + counter.count}</span>
          </span>
        </p>
        <button className="is-dense" onClick={() => counter.count++}>
          Increment
        </button>
        <button className="is-dense" onClick={() => counter.count--}>
          Decrement
        </button>
        <button className="is-dense" onClick={() => void remove(counter.id)}>
          Remove
        </button>
      </>
    );
  }, [start]);
}

let counterId = 0;

interface Counter {
  id: number;
  count: number;
}

const Counters = Resource(() => {
  const counterMap = reactive.Map<number, Counter>();

  return {
    get list() {
      return [...counterMap.values()];
    },

    remove: (id: number) => {
      counterMap.delete(id);
    },

    add() {
      const id = counterId++;
      const counter = reactive.object({
        id,
        count: 0,
      });
      counterMap.set(id, counter);
    },
  };
});
