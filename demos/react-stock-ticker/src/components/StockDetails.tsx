import { useReactive, useResource } from "@starbeam/react";
import { type ResourceBlueprint, Cell, Resource } from "@starbeam/universal";
import { Portal } from "react-portal";

import { getDailyValues, getTickerDetails } from "../lib/api/api.js";
import type { Stock } from "../lib/api/interfaces.js";
import { fmt } from "../lib/formatting.js";
import { When } from "../lib/utils.js";
import { app } from "../store.js";
import { Branding } from "./Branding.js";
import styles from "./StockDetails.module.scss";

export function StockDetails({
  ticker,
  onClose,
}: {
  ticker: string;
  onClose: () => void;
}): JSX.Element {
  const query = useResource(() => getStock(ticker), [ticker]);

  async function follow(): Promise<void> {
    const state = query.current;

    if (state === undefined || state.stock === null) {
      return;
    }

    const { stock } = state;

    const response = await getDailyValues(ticker);
    const data: Stock = {
      ...stock,
      values: [await response.json()],
    };

    app.stocks = [data, ...app.stocks];
    onClose();
  }

  return useReactive(() => {
    const state = query.current;

    const { stock } = state ?? {};

    return (
      <Portal>
        <button className={styles["cover"]} onClick={onClose} />

        <button
          className={styles["modal"]}
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <When
            value={stock}
            render={(stock) => (
              <>
                <Branding stock={stock} />
                <div className="data">
                  <h1>
                    <span>{stock.ticker}</span>
                    {stock.name}
                  </h1>
                  <a href={stock.homepage_url}>{stock.homepage_url}</a>
                </div>

                <section>
                  <p>{stock.description}</p>
                  <ul>
                    <When
                      value={stock.market_cap}
                      render={(market_cap) => (
                        <li>
                          <strong>Market Cap:</strong>$
                          {fmt(market_cap / 1_000_000_000)} Billion
                        </li>
                      )}
                    />
                    <When
                      value={stock.total_employees}
                      render={(employees) => (
                        <li>
                          <strong>Employees:</strong>
                          {fmt(employees)}
                        </li>
                      )}
                    />
                    <When
                      value={stock.share_class_shares_outstanding}
                      render={(shares) => (
                        <li>
                          <strong>Shares Outstanding:</strong>
                          {fmt(shares)}
                        </li>
                      )}
                    />
                  </ul>
                </section>

                <footer>
                  <button onClick={() => void follow()}>Follow</button>
                </footer>
              </>
            )}
          />
        </button>
      </Portal>
    );
  });
}

function getStock(ticker: string): ResourceBlueprint<{
  state: "loading" | "idle" | "loaded" | "error";
  stock: Stock | null;
}> {
  return Resource(() => {
    const state = Cell("loading" as "idle" | "loading" | "loaded" | "error");
    const stock = Cell(null as null | Stock);

    getTickerDetails(ticker)
      .then((data) => {
        state.set("loaded");
        stock.set(data);
      })
      .catch(() => {
        state.set("error");
      });

    return {
      state: state.current,
      stock: stock.current,
    };
  });
}
