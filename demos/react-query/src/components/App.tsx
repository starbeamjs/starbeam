import "@shopify/polaris/build/esm/styles.css";

import { default as axios } from "axios";
import { StrictMode } from "react";

import { type QueryResult, QUERY_CACHE } from "../lib/query.js";
import { useQuery } from "../lib/use-query.js";
import type { Todo } from "./api.js";
import {
  H1,
  Header,
  Loader,
  Refresh,
  TodoContainer,
  TodosContainer,
} from "./style.js";

export default function App() {
  return (
    <StrictMode>
      <Todos />
    </StrictMode>
  );
}

function Todos() {
  const todos = useQuery("todos", async ({ signal }) => {
    await pause(1000);
    return (
      await axios.get("https://jsonplaceholder.typicode.com/todos", {
        signal,
      })
    ).data as Todo[];
  });

  function invalidate() {
    QUERY_CACHE.invalidate("todos");
  }

  return (
    <TodosContainer>
      <Header>
        <H1>Todo List</H1>

        {todos.state === "loading" || todos.state === "reloading" ? (
          <Loader />
        ) : (
          <Refresh onClick={invalidate}>🔃</Refresh>
        )}
      </Header>
      <ResultList
        result={todos}
        each={(item) => <TodoItem key={item.id} todo={item} />}
      />
    </TodosContainer>
  );
}

function pause(ms: number) {
  return new Promise((fulfill) => {
    setTimeout(fulfill, ms);
  });
}

function ResultList<T>({
  result,
  each,
}: {
  result: QueryResult<T[]>;
  each: (_data: T) => JSX.Element;
}) {
  switch (result.state) {
    case "loading":
      return <div>Loading...</div>;
    case "error":
      return <div>Something went wrong</div>;
    case "aborted":
      return <div>Aborted</div>;
    case "loaded":
    case "reloading":
      return <>{result.data.map(each)}</>;
  }
}

function TodoItem({ todo }: { todo: Todo }) {
  return (
    <TodoContainer>
      <input type="checkbox" readOnly checked={todo.completed} />
      <p>{todo.title}</p>
    </TodoContainer>
  );
}
