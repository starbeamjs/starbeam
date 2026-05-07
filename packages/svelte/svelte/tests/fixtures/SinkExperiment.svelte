<script lang="ts">
  import { elementResourceAttachment } from "@starbeam/svelte";
  import type { ElementResourceBlueprint } from "@starbeam/svelte";

  interface Size {
    readonly width: number;
  }

  let { blueprint }: { blueprint: ElementResourceBlueprint<HTMLElement, Size> } =
    $props();

  let width = $state("100");
  let size = $state<Size | null>(null);

  const attachSize = $derived(elementResourceAttachment(blueprint, {
    into(value) {
      size = value;
    },
  }));

  function grow() {
    width = "101";
  }
</script>

<p>{size ? `width=${size.width}` : "pending"}</p>
<button onclick={grow}>grow</button>
<div data-width={width} {@attach attachSize}>box</div>
