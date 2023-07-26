import { ReactiveMap } from "@starbeam/collections";
import { useReactive, useResource } from "@starbeam/react";
import { Marker, Resource, type ResourceBlueprint } from "@starbeam/universal";
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
        <section className="user-grid">
          <div className="user-list">
            <Field
              type="number"
              min={1}
              max={10}
              onUpdate={setCurrentId}
              value={currentId}
            />
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
            {user?.get() ? <Profile user={user.get()} /> : null}
          </pre>
        </section>
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
  user: LocalUser;
  current: number;
  select: (id: number) => void;
}): JSX.Element {
  return useReactive(() => {
    const currentUser = user.get();
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
        <button
          className="p-button--positive is-inline is-dense has-icon invalidate"
          onClick={() => void user.invalidate()}
        >
          <i className="p-icon--change-version is-light" />
        </button>
        <div>
          {currentUser.status === "loading" ? (
            "Loading..."
          ) : currentUser.status === "error" ? (
            <>Error: {String(currentUser.error)}</>
          ) : (
            currentUser.value.name
          )}
        </div>
      </div>
    );
  }, [id, current]);
}

function Profile({ user }: { user: Async<ApiUser> }): JSX.Element {
  switch (user.status) {
    case "loading":
      return <div>Loading...</div>;
    case "error":
      return <div>Error: {String(user.error)}</div>;
    case "success":
      return <Jsonify value={user.value} />;
    default:
      return <div>sad</div>;
  }
}

class LocalUser {
  #id: number;
  #resource: Resource<Async<ApiUser>>;
  #invalidate: Marker;

  constructor(id: number, data: Resource<Async<ApiUser>>, marker: Marker) {
    this.#id = id;
    this.#resource = data;
    this.#invalidate = marker;
  }

  get() {
    return this.#resource.current;
  }

  invalidate() {
    this.#invalidate.mark();
  }
}

const Users = Resource(({ use }) => {
  const map = ReactiveMap<number, LocalUser>("Users");

  return {
    map,
    all: () => [...map.entries()].sort(([idA], [idB]) => idA - idB),
    get: (id: number) => {
      if (!map.has(id)) {
        const marker = Marker();
        const resource = use(User(id, marker));
        map.set(id, new LocalUser(id, resource, marker));
      }

      return map.get(id);
    },
  };
});

function User(
  id: number,
  marker: Marker
): ResourceBlueprint<Async<ApiUser>, void> {
  const resource = RemoteData(
    `https://jsonplaceholder.typicode.com/users/${id}`
  );

  return Resource(({ use }) => {
    marker.read();
    return use(resource);
  });
}
