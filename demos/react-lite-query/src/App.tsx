import "./App.css";

import { default as axios } from "axios";

import useQuery from "./lib/use-query.js";

export default function App(): JSX.Element {
  const query = useQuery("techy", async () => {
    const response = await axios.get("https://techy-api.vercel.app/api/json");
    return response.data.message as string;
  });

  if (query.status === "loaded") {
    return <p>{query.data}</p>;
  } else {
    return <p>Loading...</p>;
  }
}
