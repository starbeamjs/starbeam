<script lang="ts">
  import { fromStarbeam } from "@starbeam/svelte";
  import type { Cell } from "@starbeam/universal";
  import type { RecordedEvents } from "@starbeam-workspace/test-utils";

  let {
    count,
    events,
  }: { count: Cell<number>; events: RecordedEvents } = $props();

  const value = fromStarbeam(() => {
    events.record("compute");
    return count.current;
  });
</script>

<p>{value.current}</p>
