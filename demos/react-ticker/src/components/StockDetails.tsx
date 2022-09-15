import { Cell, Resource } from "@starbeam/core";
import { useReactive, useReactiveResource } from "@starbeam/react";
import { Portal } from "react-portal";

import { getDailyValues, getTickerDetails } from "../lib/api/api.js";
import type { Stock } from "../lib/api/interfaces.js";
import { fmt } from "../lib/formatting.js";
import { When } from "../lib/utils.jsx";
import { app } from "../store.js";
import { Branding } from "./Branding.jsx";
import styles from "./StockDetails.module.scss";

export function StockDetails({
  ticker,
  onClose,
}: {
  ticker: string;
  onClose: () => void;
}) {
  const query = useReactiveResource(() => getStock(ticker), [ticker]);

  async function follow() {
    const stock = query.current.stock;

    if (!stock) {
      return;
    }

    const response = await getDailyValues(ticker);
    const data: Stock = {
      ...stock,
      values: [await response.json()],
    };

    app.stocks = [data, ...app.stocks];
    onClose();
  }

  return useReactive(() => {
    const { stock } = query.current;

    return (
      <Portal>
        <button className={styles.cover} onClick={onClose} />

        <button
          className={styles.modal}
          onClick={(event) => event.stopPropagation()}
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
                  <button onClick={follow}>Follow</button>
                </footer>
              </>
            )}
          />
        </button>
      </Portal>
    );
  });
}

function getStock(ticker: string) {
  return Resource((resource) => {
    const state = Cell("idle" as "idle" | "loading" | "loaded" | "error");
    const stock = Cell(null as null | Stock);

    resource.on.setup(() => {
      state.set("loading");

      getTickerDetails(ticker)
        .then((data) => {
          state.set("loaded");
          stock.set(data);
        })
        .catch(() => {
          state.set("error");
        });
    });

    return () => ({
      state: state.current,
      stock: stock.current,
    });
  });
}
