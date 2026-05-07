<script lang="ts">
  import { elementResourceStore } from "@starbeam/svelte";
  import type { ElementResourceBlueprint } from "@starbeam/svelte";

  interface Size {
    readonly width: number;
  }

  let { blueprint }: { blueprint: ElementResourceBlueprint<HTMLElement, Size> } =
    $props();

  let visible = $state(true);
  let width = $state("100");
  const size = $derived(elementResourceStore(blueprint));

  function toggle() {
    visible = !visible;
  }

  function grow() {
    width = String(Number(width) + 1);
  }
</script>

<p>{$size ? `width=${$size.width}` : "pending"}</p>
<button onclick={toggle}>{visible ? "hide" : "show"}</button>
<button onclick={grow}>grow</button>
{#if visible}
  <div data-width={width} {@attach size.attach}>box</div>
{/if}
