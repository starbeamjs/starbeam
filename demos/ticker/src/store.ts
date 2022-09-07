import { Cell } from "@starbeam/core";
import { reactive } from "@starbeam/js";

import type { Stock } from "./lib/api/interfaces.js";

const STOCKS = Cell([] as Stock[]);

interface AppStore {
  activeTicker: string | null;
  stocks: Stock[];
}

export const app: AppStore = reactive.object({
  activeTicker: null,

  get stocks(): Stock[] {
    return STOCKS.current;
  },

  set stocks(value) {
    localStorage.setItem("stocks", JSON.stringify(value));
    STOCKS.set(value);
  },
});
