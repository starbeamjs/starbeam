<script lang="ts">
  import { fromStarbeam } from "@starbeam/svelte";
  import type { Cell } from "@starbeam/universal";

  let { count }: { count: Cell<number> } = $props();

  const doubled = fromStarbeam(() => count.current * 2);

  function increment() {
    count.current++;
  }
</script>

<p>{doubled.current}</p>
<button onclick={increment}>increment</button>
