import { Cell } from "@starbeam/core";
import { useReactive, useSetup } from "@starbeam/react";
import type { FormEvent } from "react";

import { searchTicker } from "../lib/api/api.js";
import type { Stock } from "../lib/api/interfaces.js";
import { For, When } from "../lib/utils.jsx";
import { app } from "../store.js";
import styles from "./Header.module.scss";

export default function Header() {
  const stocks = useSetup(() => {
    const tickers = Cell([] as Stock[]);

    async function search(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();

      const { search } = Object.fromEntries(
        new FormData(event.currentTarget)
      ) as {
        search: string;
      };

      const response = await searchTicker(search);
      const data = (await response.json()) as { results: Stock[] };

      if (data.results) {
        tickers.set(data.results);
      } else {
        console.warn("Server didn't return data", { data });
      }
    }

    function hasResults() {
      return tickers.current.length > 0;
    }

    function onTickerClick(ticker: Stock) {
      app.activeTicker = ticker.ticker;
      tickers.set([]);
    }

    return {
      tickers,
      search,
      onTickerClick,
      hasResults,
    };
  });

  return useReactive(() => (
    <header className={styles.main}>
      <div className={styles.dropdown}>
        <form onInput={stocks.search} onSubmit={stocks.search}>
          <input name="search" type="search" placeholder="Search..." />
        </form>

        <When
          value={stocks.hasResults()}
          render={() => (
            <ul>
              <For
                each={stocks.tickers.current}
                render={(ticker) => (
                  <li key={ticker.name}>
                    <button onClick={() => stocks.onTickerClick(ticker)}>
                      <h3>{ticker.ticker}</h3>
                      <p>{ticker.name}</p>
                    </button>
                  </li>
                )}
              />
            </ul>
          )}
        />
      </div>
    </header>
  ));
}
