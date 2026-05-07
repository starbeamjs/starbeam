<script lang="ts">
  import { elementResourceAttachment } from "@starbeam/svelte";
  import type { ElementResourceBlueprint } from "@starbeam/svelte";

  interface Size {
    readonly width: number;
  }

  let { blueprint }: { blueprint: ElementResourceBlueprint<HTMLElement, Size> } =
    $props();

  let visible = $state(true);
  let size = $state<Size | null>(null);

  const attachSize = $derived(elementResourceAttachment(blueprint, {
    into(value) {
      size = value;
    },
  }));
</script>

<p>{size ? `width=${size.width}` : "pending"}</p>
<button onclick={() => (visible = false)}>hide</button>
{#if visible}
  <div data-width="100" {@attach attachSize}>box</div>
{/if}
