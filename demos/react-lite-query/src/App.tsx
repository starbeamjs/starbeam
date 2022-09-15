import "./App.css";

import {
  type DevtoolsOptions,
  type UpdatePane,
  TabsPane,
} from "@starbeamx/devtool";
import { Axios } from "axios";
import { useEffect, useRef } from "react";

import useQuery from "./lib/use-query.js";

export default function App(): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const devtools = useRef<UpdatePane<{ options: DevtoolsOptions }>>();

  useEffect(() => {
    if (ref.current !== null) {
      const currentDevtools = devtools.current;

      if (currentDevtools === null || currentDevtools === undefined) {
        devtools.current = TabsPane(ref.current, {
          root: "http://localhost:3001/home/wycats/Code/Starbeam/starbeam/demos/react-lite-query/",
          roots: {
            workspace:
              "http://localhost:3001/home/wycats/Code/Starbeam/starbeam/",
          },
        });
        // devtools.current = DevtoolsLogPane(ref.current, {
        //   root: "http://localhost:3001/home/wycats/Code/Starbeam/starbeam/demos/react-lite-query/",
        //   roots: {
        //     workspace:
        //       "http://localhost:3001/home/wycats/Code/Starbeam/starbeam/",
        //   },
        // });
      } else {
        currentDevtools.update();
      }
    }
  }, [ref.current]);

  return (
    <>
      <Queried />
      <div ref={ref} />
    </>
  );
}

const axios = new Axios();

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
