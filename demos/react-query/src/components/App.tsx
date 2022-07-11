import { StrictMode } from "react";

import { useQuery } from "../lib/use-query.js";

export default function App() {
  return (
    <StrictMode>
      <Fetch />
    </StrictMode>
  );
}

function Fetch() {
  const todos = useQuery("todos", async ({ signal }) => {
    await pause(1000);
    const data = await fetch("https://jsonplaceholder.typicode.com/todos", {
      signal,
    });
    return data.json();
  });

  return (
    <StrictMode>
      <pre>{JSON.stringify(todos, null, 2)}</pre>
    </StrictMode>
  );
}

function pause(ms: number) {
  return new Promise((fulfill) => {
    setTimeout(fulfill, ms);
  });
}
