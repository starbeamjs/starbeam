<script lang="typescript">
  import { use } from "@starbeam/svelte";
  import { RemoteData } from "./remote-data.js";

  export let username: string;

  $: user = use(RemoteData(`https://api.github.com/users/${username}`));
</script>

{#if user.type === "loading"}
  <div>Loading...</div>
{:else if user.type === "data"}
  <div>
    <img src={user.data.avatar_url} />
    <h1>{user.data.name}</h1>
    <p>{user.data.bio}</p>
  </div>
{:else if user.type === "error"}
  <div>Error: {user.error.message}</div>
{/if}