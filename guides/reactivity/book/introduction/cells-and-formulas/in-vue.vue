<script>
import { use } from "@starbeam/vue";
import { LiterCounter } from "#reactive/liter-counter";

export default {
  setup() {
    const { increment, description } = use(LiterCounter);

    return { increment, description };
  },
};
</script>

<template>
  <button v-on:click="increment">Add a liter</button>
  <p>{description}</p>
</template>