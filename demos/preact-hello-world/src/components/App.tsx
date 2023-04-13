import { createCell, service, use } from "@starbeam/preact";
import type { ResourceBlueprint } from "@starbeam/universal";
import { Cell, Resource } from "@starbeam/universal";
import type { JSX } from "preact";
import { useState } from "preact/hooks";

import Card from "./Card.jsx";

export default function App(): JSX.Element {
  const counter = use(Count);

  const [showChild, setShowChild] = useState(true);
  const cell = createCell(0, "cell");

  const CounterService = CounterWithCleanup();
  const resourceStatus = createCell("idle", "resourceStatus");

  function isIdle(): boolean {
    return resourceStatus.current === "idle";
  }

  function toggle(): void {
    if (isIdle()) {
      setShowChild(false);
    } else {
      setShowChild(true);
    }
  }

  const child = showChild ? (
    <>
      <hr /> <UsingCounterResource status={resourceStatus} />
    </>
  ) : null;

  return (
    <div class="cards">
      <Card>
        <h1>
          Counter (using <code>Cell</code>)
        </h1>
        <p>Count: {cell}</p>
        <button onClick={() => cell.current++}>++</button>
      </Card>
      <Card>
        <h1>
          Counter (using <code>create</code>)
        </h1>
        <Counter counter={counter} />
      </Card>
      <hr />
      <h2>Resource</h2>
      <Card class="wide">
        <button onClick={toggle}>
          {isIdle() ? "Clean up resource" : "Create resource"}
        </button>
        <p>
          When the resource is <strong>enabled</strong>, both boxes below will
          show the status <code>idle</code> and a counter.
        </p>
        <p>
          When it is <strong>disabled</strong>, both boxes below will show the
          status <code>cleaned up</code> and nothing else.
        </p>
      </Card>

      <Card>
        <h1>A resource</h1>
        <p>status: {resourceStatus}</p>
        {child}
      </Card>
      <Card>
        <h1>A resource</h1>
        <p>status: {resourceStatus}</p>
        {child}
      </Card>
      <hr />
      <h2>Services</h2>
      <p>
        A service is a <em>resource</em> that is only created once per
        application by using <code>service()</code>.
      </p>
      <p>
        The first time <code>service</code> is called with a particular
        blueprint, the service is instantiated. After that point, the same
        service is returned.
      </p>
      <hr />
      <h3>Stateful Services</h3>
      <p>A stateful service has data, but no cleanup.</p>
      <Card class="start">
        <UsingCounterService name="pure" Service={Count} />
      </Card>
      <Card>
        <UsingCounterService name="pure" Service={Count} />
      </Card>
      <hr />
      <h2>Resourceful Services</h2>
      <p>A stateful service has data and cleanup.</p>
      <Card class="start">
        <UsingCounterService name="resourceful" Service={CounterService} />
      </Card>
      <Card>
        <UsingCounterService name="resourceful" Service={CounterService} />
      </Card>
    </div>
  );
}

function UsingCounterService({
  name,
  Service,
}: {
  name: string;
  Service: ResourceBlueprint<CounterData>;
}): JSX.Element {
  const counter = service(Service);

  return (
    <>
      <h1>Counter</h1>
      <h2>Using {name} service</h2>
      <Counter counter={counter} />
    </>
  );
}

function UsingCounterResource({
  status,
}: {
  status: Cell<string>;
}): JSX.Element {
  const counter = use(CounterWithCleanup(status));

  status.set("idle");

  return (
    <>
      <h2>Child</h2>
      <h3>status: {status.current}</h3>
      <Counter counter={counter} />
    </>
  );
}

function Counter({ counter }: { counter: CounterData }): JSX.Element {
  return (
    <>
      <p>Count: {counter.count}</p>
      <button onClick={counter.increment}>++</button>
    </>
  );
}

interface CounterData {
  readonly count: number;
  increment: () => void;
}

const Count = Resource(() => {
  const count = Cell(0, "data count");

  return {
    get count(): number {
      return count.current;
    },
    increment: () => {
      count.current++;
    },
  };
});

function CounterWithCleanup(
  status: Cell<string> = Cell("new")
): ResourceBlueprint<{
  readonly count: number;
  increment: () => void;
}> {
  return Resource(({ on }) => {
    const count = Cell(0, "resource count");

    on.cleanup(() => {
      status.set("cleaned up");
    });

    return {
      get count() {
        return count.current;
      },
      increment: () => {
        count.current++;
      },
    };
  }, "CounterWithCleanup");
}
