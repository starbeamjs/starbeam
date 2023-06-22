import { useReactive, useResource } from "@starbeam/react";
import { StrictMode, useState } from "react";

import { RemoteData } from "../shared/remote-data.js";
import { Field, Jsonify } from "../shared/shared.js";

export default function App(): JSX.Element {
  const [id, setId] = useState("1");

  return (
    <StrictMode>
      <Field type="number" label="User ID" onUpdate={setId} value={id} />
      <Profile id={id} />
    </StrictMode>
  );
}

function Profile({ id }: { id: string }): JSX.Element {
  const user = useResource(
    () => RemoteData(`https://jsonplaceholder.typicode.com/users/${id}`),
    [id]
  );

  return useReactive(() => {
    switch (user.status) {
      case "loading":
        return <pre>Loading...</pre>;
      case "error":
        return <pre>Error: {String(user.value)}</pre>;
      case "success":
        return (
          <pre>
            <Jsonify value={user.value} />
          </pre>
        );
      default:
        return <pre>sad</pre>;
    }
  }, []);
}
