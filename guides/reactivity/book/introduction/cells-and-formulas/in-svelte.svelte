<script>
  import { LiterCounter } from "#reactive/liter-counter";
  import { use } from "@starbeam/svelte";

  $: liters = use(LiterCounter);
</script>

<button on:click={liters.increment}>Add a liter</button>
<p>{liters.description}</p>