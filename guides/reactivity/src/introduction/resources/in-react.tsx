import { use } from "@starbeam/react";
import { RemoteData } from "./remote-data.js";

export default function UserCard({ username }: { username: string }) {
  const user = use(
    () => RemoteData(`https://api.github.com/users/${username}`),
    [username]
  );

  switch (user.type) {
    case "loading":
      return <div>Loading...</div>;
    case "data":
      return (
        <div>
          <img src={user.data.avatar_url} />
          <h1>{user.data.name}</h1>
          <p>{user.data.bio}</p>
        </div>
      );
    case "error":
      return <div>Error: {user.error.message}</div>;
  }
}
