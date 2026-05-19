<script lang="ts">
  import { fromStarbeam } from "@starbeam/svelte";
  import type { Cell } from "@starbeam/universal";

  let { count }: { count: Cell<number> } = $props();

  let multiplier = $state(2);
  const scaled = fromStarbeam(() => count.current * multiplier);

  function incrementCount() {
    count.current++;
  }

  function triple() {
    multiplier = 3;
  }
</script>

<p>{scaled.current}</p>
<button onclick={incrementCount}>increment count</button>
<button onclick={triple}>triple</button>
