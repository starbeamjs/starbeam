<script lang="ts">
  import { fromStarbeam } from "@starbeam/svelte";
  import type { Cell } from "@starbeam/universal";

  let { count }: { count: Cell<number> } = $props();

  let enabled = $state(false);
  const value = fromStarbeam(() => (enabled ? `on=${count.current}` : "off"));

  function enable() {
    enabled = true;
  }

  function increment() {
    count.current++;
  }
</script>

<p>{value.current}</p>
<button onclick={enable}>enable</button>
<button onclick={increment}>increment</button>
