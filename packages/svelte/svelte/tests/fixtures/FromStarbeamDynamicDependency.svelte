<script lang="ts">
  import { fromStarbeam } from "@starbeam/svelte";
  import type { Cell } from "@starbeam/universal";

  let { left, right }: { left: Cell<number>; right: Cell<number> } = $props();

  let side = $state<"left" | "right">("left");
  const selected = fromStarbeam(() =>
    side === "left" ? `left=${left.current}` : `right=${right.current}`,
  );

  function chooseRight() {
    side = "right";
  }

  function bumpLeft() {
    left.current++;
  }

  function bumpRight() {
    right.current++;
  }
</script>

<p>{selected.current}</p>
<button onclick={chooseRight}>choose right</button>
<button onclick={bumpLeft}>bump left</button>
<button onclick={bumpRight}>bump right</button>
