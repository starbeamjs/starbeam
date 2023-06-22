import { ReactiveMap } from "@starbeam/collections";
import { useReactive, useResource } from "@starbeam/react";
import { Resource, type ResourceBlueprint } from "@starbeam/universal";
import { useState } from "react";

import type { ApiUser } from "../shared/api.js";
import type { Async } from "../shared/async.js";
import { RemoteData } from "../shared/remote-data.js";
import { Field, Jsonify } from "../shared/shared.js";

export default function App(): JSX.Element {
  const [currentId, setCurrentId] = useState("1");
  const users = useResource(Users);

  return useReactive(() => {
    const user = users.get(Number(currentId));

    return (
      <section className="user-grid">
        <div className="user-list">
          <Field
            type="number"
            label="User ID"
            min={1}
            max={10}
            onUpdate={setCurrentId}
            value={currentId}
          />
          <div className="user-list">
            {users.all().map(([id, user]) => (
              <UserItem
                key={id}
                id={id}
                user={user}
                select={(id) => void setCurrentId(String(id))}
                current={Number(currentId)}
              />
            ))}
          </div>
        </div>
        <pre className="profile">
          {user?.current ? <Profile user={user.current} /> : null}
        </pre>
      </section>
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
    const isCurrent = id === current;

    return (
      <div className="user-item">
        <button
          className="u-no-margin p-button has-icon is-dense is-inline select"
          disabled={isCurrent}
          onClick={() => void select(id)}
        >
          <i
            className={isCurrent ? "p-icon--task-outstanding" : "p-icon--stop"}
          />
          <span>Select</span>
        </button>
        <UserName user={user.current} />
      </div>
    );
  }, [id, current]);
}

function UserName({ user }: { user: Async<ApiUser> }): JSX.Element {
  return useReactive(() => {
    const className = user.status === "error" ? "error" : "";

    switch (user.status) {
      case "loading":
        return <div className={className}>Loading...</div>;
      case "error":
        return <div className={className}>Error: {String(user.value)}</div>;
      case "success":
        return <div className={className}>{user.value.name}</div>;
    }
  }, [user]);
}

function Profile({ user }: { user: Async<ApiUser> }): JSX.Element {
  return useReactive(() => {
    switch (user.status) {
      case "loading":
        return <div className="profile">Loading...</div>;
      case "error":
        return <div className="profile">Error: {String(user.value)}</div>;
      case "success":
        return <Jsonify value={user.value} />;
      default:
        return <div className="profile">sad</div>;
    }
  }, [user]);
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

function User(id: number): ResourceBlueprint<Async<ApiUser>> {
  return RemoteData(`https://jsonplaceholder.typicode.com/users/${id}`);
}
