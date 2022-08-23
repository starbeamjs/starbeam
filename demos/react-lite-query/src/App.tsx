import "./App.css";

import { DevtoolsLogPane } from "@starbeamx/devtool";
import { default as axios } from "axios";
import { useEffect, useRef } from "react";

import useQuery from "./lib/use-query.js";

export default function App(): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current !== null) {
      DevtoolsLogPane(ref.current, {
        root: "http://localhost:3001/home/wycats/Code/Starbeam/starbeam/demos/react-lite-query/",
      });
    }
  }, [ref.current]);

  return (
    <>
      <Queried />
      <div ref={ref} />
    </>
  );
}

function Queried(): JSX.Element {
  const query = useQuery("techy", async () => {
    const response = await axios.get("https://techy-api.vercel.app/api/json");
    return response.data.message as string;
  });

  if (query.state === "loaded") {
    return <p>{query.data}</p>;
  } else {
    return <p>Loading...</p>;
  }
}
