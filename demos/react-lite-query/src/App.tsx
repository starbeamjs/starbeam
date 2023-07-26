import "./App.css";

import { Axios } from "axios";

import useQuery from "./lib/use-query.js";

type FIXME = never;
type DevtoolsOptions = FIXME;

export default function App(): JSX.Element {
  return <Queried />;
}

const axios = new Axios();

function Queried(): JSX.Element {
  const query = useQuery("techy", async () => {
    const response = await axios.get<{ message: string }>(
      "https://techy-api.vercel.app/api/json"
    );
    return response.data.message;
  });

  if (query.state === "loaded") {
    return <p>{query.data}</p>;
  } else {
    return <p>Loading...</p>;
  }
}
