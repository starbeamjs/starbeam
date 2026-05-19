<script lang="ts">
  import type { StarbeamValue } from "@starbeam/svelte";

  let { label, value }: { label: string; value: StarbeamValue<number> } =
    $props();
</script>

<p>{label}={value.current}</p>
