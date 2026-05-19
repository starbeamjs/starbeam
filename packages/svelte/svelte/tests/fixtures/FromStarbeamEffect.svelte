<script lang="ts">
  import { fromStarbeam } from "@starbeam/svelte";
  import type { Cell } from "@starbeam/universal";
  import type { RecordedEvents } from "@starbeam-workspace/test-utils";

  let {
    count,
    events,
  }: { count: Cell<number>; events: RecordedEvents } = $props();

  let observed = $state(0);
  const doubled = fromStarbeam(() => count.current * 2);

  $effect(() => {
    const value = doubled.current;
    observed = value;
    events.record(`effect:${value}`);
  });

  function increment() {
    count.current++;
  }
</script>

<p>{observed}</p>
<button onclick={increment}>increment</button>