## Factories

A factory is a function that returns a new reactive object.

- _Reactive Factories_ return reactive objects.
- _Resource Factories_ also return reactive objects, but they also register cleanup functions that
  are called when the object is no longer needed.

> You can use a class as a factory, but it's not required. When you use a class as a factory, its
> constructor must take zero required arguments.

<details>

<summary>The Type of a Factory</summary>

```ts
// A reactive factory is:
//
// - a function that returns a value or a reactive value, or
// - a class whose constructor takes zero required arguments.
type ReactiveFactory<T> = (() => T | Reactive<T>) | (new () => T);

// A resource factory is:
//
// - a function that takes a `ResourceRun` and returns a value
//   or a reactive value, or
// - a class whose constructor takes a `ResourceRun` as its first
//   and only required argument
type ResourceFactory<T> =
  | ((run: ResourceRun) => T | Reactive<T>)
  | (new (run: ResourceRun) => T);
```

</details>

When you use a factory in the context of a component, the factory is instantiated once, when the
component is initially rendered. When the component's render function is called again, the same
reactive object is returned.

Here's an example of a factory for a reactive counter:

```ts
function Counter() {
  const counter = Cell(0);

  return {
    get counter() {
      return counter.get();
    },
    increment() {
      counter.update((i) => i + 1);
    },
  };
}
```

<details>
  <summary>As a class</summary>

```ts
class Counter {
  @reactive #counter = 0;

  increment() {
    this.#counter.update((i) => i + 1);
  }
}
```

</details>

#### In React

```tsx
function CounterWidget() {
  const counter = use(Counter);

  return useReactive(() => (
    <div>
      <button onClick={counter.increment}>Increment</button>
      <div>Counter: {counter.counter}</div>
    </div>
  ));
}
```

#### In Preact

```tsx
function CounterWidget() {
  const counter = use(Counter);

  return (
    <div>
      <button onClick={counter.increment}>Increment</button>
      <div>Counter: {counter.counter}</div>
    </div>
  );
}
```

## Services

A _service_ is a factory that is instantiated once for the lifetime of the application. If a
resource factory is used as a service, the cleanup function is called when the application is
cleaned up.

### Reactive Services

You can use any reactive factory as a service.

For example, let's say you want to keep track of the user's session. You can write a `UserSession`
reactive factory.

```ts
interface User {
  id: string;
  name: string;
  avatar: string;
}

function UserSession() {
  const session = Cell<User | null>(null);

  return {
    get user() {
      return session.current;
    },
    login(user: User) {
      session.set(user);
    },
    logout() {
      session.set(null);
    },
  };
}
```

Then, you can use the `UserSession` service in your components.

#### In React

```tsx
import { service } from "@starbeam/universal";
import { useReactive } from "@starbeam/react";

function AvatarWidget() {
  const session = service(UserSession);

  return useReactive(() => {
    if (session.user) {
      return <img src={session.user.avatar_url} />;
    } else {
      return <img src="/assets/default-avatar.png" />;
    }
  });
}
```

#### In Preact

```tsx
import { service } from "@starbeam/universal";

function AvatarWidget() {
  const session = service(UserSession);

  if (session.user) {
    return <img src={session.user.avatar_url} />;
  } else {
    return <img src="/assets/default-avatar.png" />;
  }
}
```

### Resourceful Services

You can also use resource factories as services. In this case, the resource will be created the
first time it's requested. The resource's cleanup function is called when the application is cleaned
up.

For example, let's say that your backend gives you a WebSocket-based API for logging in and out, and
getting updates to the current user.

#### The Backend API

The API for "my-backend" looks like this:

```ts
/**
 * Connect to the backend and return a `UserSession` that
 * can be used to interact with the current session and
 * get live updates to the user's information.
 */
export function connectUserSession(): UserSession;

interface UserSession {
  /**
   * When the user successfully completes the oauth flow,
   * this event is called with the user information.
   */
  on("login", (user: User) => void): void;
  /**
   * When the user logs out or revokes the current
   * session, this event is called.
   */
  on("logout", () => void): void;
  /**
   * When new user information is available, this event is
   * called with the new user information.
   */
  on("update", (user: User) => void): void;

  /**
   * Disconnect the socket to the server. This must be
   * called when the session is no longer needed or the
   * socket will leak.
   */
  disconnect(): void;

  /**
   * Start the OAuth flow to log in. When the flow
   * completes successfully, the flow will redirect
   * the user back to the current page, and the
   * "login" event will be called.
   */
  startOauthFlow(): void;

  /**
   * Log out of the current session. The "logout"
   * event will be called when the logout is complete.
   */
  logout(): void;
}
```

#### Writing `UserSession` as a Resource

You can write a `UserSession` resource factory that uses this API. The resource handles all of the
backend details, and exposes a reactive object that you can use in your components to get up-to-date
information about your user.

```ts
import { Resource } from "@starbeam/universal";
import { connectUserSession } from "my-backend";

const UserSession = Resource(({ on }) => {
  const session = connectUserSession();
  const user = Cell<User | null>(null);

  session.on("login", (user) => {
    user.set(user);
  });

  session.on("logout", () => {
    user.set(null);
  });

  session.on("update", (user) => {
    user.set(user);
  });

  on.cleanup(() => {
    session.close();
  });

  return {
    get user() {
      return user.current;
    },
    oauth: () => {
      session.startOauthFlow();
    },
    logout: () => {
      user.set(null);
      session.logout();
    },
  };
});
```

<details>
  <summary>As a Class</summary>

```ts
import { reactive } from "@starbeam/js";

class UserSession {
  @reactive #user: User | null = null;
  readonly #session: UserSession;

  constructor({ on }: ResourceContext) {
    const session = (this.#session = connectUserSession());

    session.on("login", (user) => {
      this.#user = user;
    });

    session.on("logout", () => {
      this.#user = null;
    });

    session.on("update", (user) => {
      this.#user = user;
    });

    on.cleanup(() => {
      session.close();
    });
  }

  oauth() {
    this.#session.startOauthFlow();
  }

  logout() {
    this.#user = null;
    this.#session.logout();
  }
}
```

</details>

#### Accessing the User Data in a Component

To access the user data in your components, you use it the same way as [Reactive
Services](#reactive-services) above.

#### In React

```tsx
import { service } from "@starbeam/universal";
import { useReactive } from "@starbeam/react";
import { useFetch } from "usehooks-ts";

function AvatarWidget() {
  const session = service(UserSession);

  return useReactive(() => {
    if (session.user) {
      return <img src={data.avatar_url} />;
    } else {
      return <img src="/assets/default-avatar.png" />;
    }
  });
}
```

#### In Preact

```tsx
import { service } from "@starbeam/universal";
import { useFetch } from "usehooks-ts";

function AvatarWidget() {
  const session = service(UserSession);

  if (session.user) {
    return <img src={session.user.avatar_url} />;
  } else {
    return <img src="/assets/default-avatar.png" />;
  }
}
```

#### Interacting with the User Session

You can interact with the user session in your components by calling the methods on the service.

#### In React

```tsx
import { service } from "@starbeam/universal";
import { useReactive } from "@starbeam/react";

function Account() {
  return (
    <>
      <Login />
      <UserInfo />
    </>
  );
}

function Login() {
  const session = service(UserSession);

  return useReactive(() => {
    if (session.user) {
      return <button onClick={session.logout}>Log Out</button>;
    } else {
      return <button onClick={session.oauth}>Log In</button>;
    }
  });
}

function UserInfo() {
  const session = service(UserSession);

  return useReactive(() => {
    if (session.user) {
      const data = session.user;

      return (
        <>
          <img src={data.avatar_url} />
          <dl>
            <dt>Username</dt>
            <dd>{data.username}</dd>
            <dt>Display Name</dt>
            <dd>{data.display_name}</dd>
          </dl>
        </>
      );
    } else {
      return <div>Please log in</div>;
    }
  });
}
```

#### In Preact

```tsx
import { service } from "@starbeam/universal";

function Account() {
  return (
    <>
      <Login />
      <UserInfo />
    </>
  );
}

function Login() {
  const session = service(UserSession);

  if (session.user) {
    return <button onClick={session.logout}>Log Out</button>;
  } else {
    return <button onClick={session.oauth}>Log In</button>;
  }
}

function UserInfo() {
  const { user } = service(UserSession);

  if (user) {
    return (
      <>
        <img src={user.avatar_url} />
        <dl>
          <dt>Username</dt>
          <dd>{user.username}</dd>
          <dt>Display Name</dt>
          <dd>{user.display_name}</dd>
        </dl>
      </>
    );
  } else {
    return <div>Please log in</div>;
  }
}
```
