import { useResource } from "@starbeam/react";
import type { ResourceBlueprint } from "@starbeam/universal";
import { StrictMode, useState } from "react";

import type { ApiUser } from "../shared/api.js";
import { RemoteData } from "../shared/remote-data.js";
import { type Async, Field, Jsonify } from "../shared/shared.js";

export default function App(): JSX.Element {
  const [id, setId] = useState("1");

  return (
    <StrictMode>
      <Field type="number" onUpdate={setId} value={id} />
      <Profile id={id} />
    </StrictMode>
  );
}

function Profile({ id }: { id: string }): JSX.Element {
  const user = useResource(() => User(id), [id]);

  switch (user?.status) {
    case "loading":
      return <pre>Loading...</pre>;
    case "error":
      return <pre>Error: {String(user.error)}</pre>;
    case "success":
      return (
        <pre>
          <Jsonify value={user.value} />
        </pre>
      );
    default:
      return <pre>sad</pre>;
  }
}

function User(id: string): ResourceBlueprint<Async<ApiUser>, void> {
  return RemoteData(`https://jsonplaceholder.typicode.com/users/${id}`);
}
