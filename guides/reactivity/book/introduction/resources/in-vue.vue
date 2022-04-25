<script setup lang="ts">
import { use } from "@starbeam/vue";
import { RemoteData } from "./remote-data.js";

const props = defineProps<{ username: string }>();

const user = use(() => RemoteData(`https://api.github.com/users/${props.username}`));

defineExpose({ user });
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