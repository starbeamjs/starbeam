<script lang="ts">
  import { reactive as reactiveCollections } from "@starbeam/collections";
  import { fromStarbeam } from "@starbeam/svelte";

  interface LineItem {
    readonly quantity: number;
    readonly unitCents: number;
  }

  class Cart {
    readonly #items = reactiveCollections.Map<string, LineItem>();

    get totalCents(): number {
      return [...this.#items.values()].reduce(
        (total, item) => total + item.quantity * item.unitCents,
        0,
      );
    }

    add(id: string, item: LineItem): void {
      this.#items.set(id, item);
    }
  }

  const cart = new Cart();
  cart.add("coffee", { quantity: 1, unitCents: 300 });

  const total = fromStarbeam(() => cart.totalCents);

  function addBagel() {
    cart.add("bagel", { quantity: 2, unitCents: 250 });
  }
</script>

<p>{total.current}</p>
<button onclick={addBagel}>add bagel</button>
