<script lang="ts">
  import { fromStarbeam } from "@starbeam/svelte";
  import type { Cell } from "@starbeam/universal";
  import type { RecordedEvents } from "@starbeam-workspace/test-utils";

  import Consumer from "./FromStarbeamConsumer.svelte";

  let {
    count,
    events,
  }: { count: Cell<number>; events: RecordedEvents } = $props();

  let first = $state(true);
  let second = $state(true);

  const value = fromStarbeam(() => {
    events.record("compute");
    return count.current;
  });

  function hideFirst() {
    first = false;
  }

  function hideSecond() {
    second = false;
  }

  function increment() {
    count.current++;
  }
</script>

<button onclick={hideFirst}>hide first</button>
<button onclick={hideSecond}>hide second</button>
<button onclick={increment}>increment</button>
{#if first}
  <Consumer label="first" {value} />
{/if}
{#if second}
  <Consumer label="second" {value} />
{/if}
