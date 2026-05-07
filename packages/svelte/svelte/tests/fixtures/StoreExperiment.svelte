<script lang="ts">
  import { elementResourceStore } from "@starbeam/svelte";
  import type { ElementResourceBlueprint } from "@starbeam/svelte";

  interface Size {
    readonly width: number;
  }

  let { blueprint }: { blueprint: ElementResourceBlueprint<HTMLElement, Size> } =
    $props();

  let width = $state("100");
  const size = $derived(elementResourceStore(blueprint));

  function grow() {
    width = "101";
  }
</script>

<p>{$size ? `width=${$size.width}` : "pending"}</p>
<button onclick={grow}>grow</button>
<div data-width={width} {@attach size.attach}>box</div>
