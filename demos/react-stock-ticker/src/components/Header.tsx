import { setup, useReactive } from "@starbeam/react";
import { Cell } from "@starbeam/universal";
import type { FormEvent } from "react";

import { searchTicker } from "../lib/api/api.js";
import type { Stock } from "../lib/api/interfaces.js";
import { For, When } from "../lib/utils.js";
import { app } from "../store.js";
import STYLES from "./Header.module.scss";

const styles = STYLES as {
  readonly main: string;
  readonly dropdown: string;
};

export default function Header(): JSX.Element {
  const stocks = setup(() => {
    const tickers = Cell([] as Stock[]);

    async function search(event: FormEvent<HTMLFormElement>): Promise<void> {
      event.preventDefault();

      const { search } = Object.fromEntries(
        new FormData(event.currentTarget)
      ) as {
        search: string;
      };

      const response = await searchTicker(search);
      const data = (await response.json()) as { results?: Stock[] };

      if (data.results) {
        tickers.set(data.results);
      } else {
        console.warn("Server didn't return data", { data });
      }
    }

    function hasResults(): boolean {
      return tickers.current.length > 0;
    }

    function onTickerClick(ticker: Stock): void {
      app.activeTicker = ticker.ticker;
      tickers.set([]);
    }

    return {
      tickers,
      search: search as (event: FormEvent<HTMLFormElement>) => void,
      onTickerClick,
      hasResults,
    };
  });

  return useReactive(
    () => (
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
                      <button
                        onClick={() => {
                          stocks.onTickerClick(ticker);
                        }}
                      >
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
    ),
    []
  );
}
