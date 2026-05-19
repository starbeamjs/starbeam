<script lang="ts">
  import { fromStarbeam } from "@starbeam/svelte";
  import type { Cell } from "@starbeam/universal";
  import type { RecordedEvents } from "@starbeam-workspace/test-utils";

  let {
    count,
    events,
  }: { count: Cell<number>; events: RecordedEvents } = $props();

  const doubled = fromStarbeam(() => {
    events.record("compute");
    return count.current * 2;
  });
</script>

<p>{doubled.current}</p>
