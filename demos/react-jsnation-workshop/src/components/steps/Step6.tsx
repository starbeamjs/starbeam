import { ReactiveMap } from "@starbeam/collections";
import { useReactive, useResource } from "@starbeam/react";
import { Marker, Resource } from "@starbeam/universal";
import { useState } from "react";

import type { ApiUser } from "../shared/api.js";
import { getAsync, type InvalidatableAsync } from "../shared/async.js";
import { RemoteData } from "../shared/remote-data.js";
import { Chip, Field, Jsonify } from "../shared/shared.js";

export default function App(): JSX.Element {
  const [currentId, setCurrentId] = useState("1");
  const [filter, setFilter] = useState("");
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
          <Field
            type="text"
            label="Filter"
            onUpdate={setFilter}
            value={filter}
          />
          <Statistics users={users} />
          {users
            .all()
            .filter(
              ([, user]) =>
                user.status !== "success" ||
                user.matches(filter) ||
                filter === "",
            )
            .map(([id, user]) => (
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
          <Profile user={user} />
        </pre>
      </section>
    );
  }, [currentId, setCurrentId, filter, setFilter, users]);
}

function Statistics({ users }: { users: Users }): JSX.Element {
  return useReactive(() => {
    const all = users.all();
    const errors = all.filter(([, user]) => user.status === "error").length;

    const errorStats =
      errors > 0 ? <Chip title="errors" value={errors} /> : null;

    return (
      <div className="chips">
        {errorStats}
        <Chip title="downloaded" value={all.length - errors} />
      </div>
    );
  }, [users]);
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
        <UserName user={user} />
        <button
          className="p-button--positive is-inline is-dense has-icon invalidate"
          onClick={() => void user.invalidate()}
        >
          <i
            className={
              user.isReloading
                ? "p-icon--status-waiting is-light"
                : "p-icon--change-version is-light"
            }
          />
        </button>
      </div>
    );
  }, [id, current]);
}

function UserName({ user }: { user: LocalUser }): JSX.Element {
  return useReactive(() => {
    const classNames = [];
    if (user.isReloading) classNames.push("refreshing");
    if (user.status === "error") classNames.push("error");
    const className = classNames.join(" ");

    const data = user.data;

    switch (data.status) {
      case "loading":
        return <div className={className}>Loading...</div>;
      case "error":
        return <div className={className}>Error: {String(data.value)}</div>;
      case "success":
        return <div className={className}>{data.value.name}</div>;
    }
  }, []);
}

function Profile({ user }: { user: LocalUser | undefined }): JSX.Element {
  return useReactive(() => {
    const current = user?.data;

    if (!current) {
      return <div>Loading...</div>;
    }

    switch (current.status) {
      case "loading":
        return <div>Loading...</div>;
      case "error":
        return (
          <div>
            {user.isReloading ? <p>Refreshing...</p> : null}
            Error: {String(current.value)}
          </div>
        );
      case "success":
        return (
          <>
            {user.isReloading ? <p>Refreshing...</p> : <p>Up to date.</p>}
            <Jsonify value={current.value} />;
          </>
        );
      default:
        return <div>sad</div>;
    }
  }, [user]);
}

class LocalUser {
  readonly id: number;
  #resource: InvalidatableAsync<ApiUser>;
  #invalidate: Marker;

  constructor(id: number, data: InvalidatableAsync<ApiUser>, marker: Marker) {
    this.id = id;
    this.#resource = data;
    this.#invalidate = marker;
  }

  matches(text: string) {
    const data = this.data;

    return (
      data.status === "success" &&
      data.value.name.toLowerCase().includes(text.toLowerCase())
    );
  }

  get status() {
    return this.data.status;
  }

  get isReloading() {
    return this.#resource.status === "reloading";
  }

  get data() {
    return getAsync(this.#resource);
  }

  invalidate() {
    this.#invalidate.mark();
  }
}

interface Users {
  map: Map<number, LocalUser>;
  all: () => [number, LocalUser][];
  get: (id: number) => LocalUser | undefined;
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

        queueMicrotask(() => {
          map.set(id, new LocalUser(id, resource, marker));
        });
      }

      return map.get(id);
    },
  } satisfies Users;
});

function User(id: number, marker: Marker) {
  return RemoteData<ApiUser>(
    `https://jsonplaceholder.typicode.com/users/${id}`,
    { invalidate: marker, errorRate: 0.25 },
  );
}
