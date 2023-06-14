import { ReactiveMap } from "@starbeam/collections";
import { useReactive, useResource } from "@starbeam/react";
import { Resource, type ResourceBlueprint } from "@starbeam/universal";
import { StrictMode, useState } from "react";

import type { ApiUser } from "../shared/api.js";
import { RemoteData } from "../shared/remote-data.js";
import { type Async, Field, Jsonify } from "../shared/shared.js";

export default function App(): JSX.Element {
  const [currentId, setCurrentId] = useState("1");
  const users = useResource(Users, []);

  return useReactive(() => {
    const user = users?.get(Number(currentId));
    console.log({ users: users?.map, id: currentId, user });

    return (
      <StrictMode>
        <Field
          type="number"
          min={1}
          max={10}
          onUpdate={setCurrentId}
          value={currentId}
        />
        <div className="user-grid">
          {users?.all().map(([id, user]) => (
            <UserItem
              key={id}
              id={id}
              user={user}
              select={(id) => void setCurrentId(String(id))}
              current={Number(currentId)}
            />
          ))}
        </div>
        <pre className="profile">
          {user?.current ? <Profile user={user.current} /> : null}
        </pre>
      </StrictMode>
    );
  }, [currentId]);
}

function UserItem({
  id,
  user,
  current,
  select,
}: {
  id: number;
  user: Resource<Async<ApiUser>>;
  current: number;
  select: (id: number) => void;
}): JSX.Element {
  return useReactive(() => {
    const currentUser = user.current;
    const isCurrent = id === current;

    const classes = [
      "u-no-margin",
      isCurrent ? "p-button--positive" : "p-button--brand",
    ].join(" ");

    return (
      <p className="user-item">
        <button
          className={classes}
          disabled={isCurrent}
          onClick={() => void select(id)}
        >
          {isCurrent ? "✅ Selected" : "Select"}
        </button>
        {currentUser.status === "loading" ? (
          <div>Loading...</div>
        ) : currentUser.status === "error" ? (
          <div>Error: {String(currentUser.error)}</div>
        ) : (
          <div>{currentUser.value.name}</div>
        )}
      </p>
    );
  }, [id, current]);
}

function Profile({ user }: { user: Async<ApiUser> }): JSX.Element {
  switch (user.status) {
    case "loading":
      return <div className="profile">Loading...</div>;
    case "error":
      return <div className="profile">Error: {String(user.error)}</div>;
    case "success":
      return <Jsonify value={user.value} />;
    default:
      return <div className="profile">sad</div>;
  }
}

const Users = Resource(({ use }) => {
  const map = ReactiveMap<number, Resource<Async<ApiUser>>>("Users");

  return {
    map,
    all: () => [...map.entries()].sort(([idA], [idB]) => idA - idB),
    get: (id: number) => {
      if (!map.has(id)) {
        map.set(id, use(User(id)));
      }

      return map.get(id);
    },
  };
});

function User(id: number): ResourceBlueprint<Async<ApiUser>, void> {
  return RemoteData(`https://jsonplaceholder.typicode.com/users/${id}`);
}
