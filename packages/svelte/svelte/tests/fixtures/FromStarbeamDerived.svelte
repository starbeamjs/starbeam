<script lang="ts">
  import { fromStarbeam } from "@starbeam/svelte";
  import type { Cell } from "@starbeam/universal";

  let { count }: { count: Cell<number> } = $props();

  const value = fromStarbeam(() => count.current);
  const doubled = $derived(value.current * 2);

  function increment() {
    count.current++;
  }
</script>

<p>{doubled}</p>
<button onclick={increment}>increment</button>
