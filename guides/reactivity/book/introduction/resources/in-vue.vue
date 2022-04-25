<script lang="typescript">
import { use } from "@starbeam/vue";

export let username: string;

export default {
  setup() {
    const { user } = use(RemoteData(`https://api.github.com/users/${username}`));

    return { user };
  },
};
</script>

<template>
  <div v-if="user.type === 'loading'">Loading...</div>
  <div v-if="user.type === 'data'">
    <img :src="user.data.avatar_url" />
    <h1>{user.data.name}</h1>
    <p>{user.data.bio}</p>
  </div>
  <div v-if="user.type === 'error'">Error: {user.error.message}</div>
</template>