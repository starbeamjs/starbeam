import { useReactive } from "@starbeam/react";
import { useEffect } from "react";

import STYLES from "./App.module.scss";
import { Branding } from "./components/Branding.js";
import Header from "./components/Header.js";
import { StockDetails } from "./components/StockDetails.js";
import type { Stock } from "./lib/api/interfaces.js";
import { For, When } from "./lib/utils.js";
import { app } from "./store.js";

const styles = STYLES as {
  readonly app: string;
};

export default function App(): JSX.Element {
  useEffect(() => {
    const stocks = localStorage.getItem("stocks");

    if (!stocks) {
      return;
    }

    app.stocks = JSON.parse(stocks) as Stock[];
  }, []);

  return useReactive(() => {
    return (
      <>
        <div className={styles.app}>
          <Header />

          <main>
            <ul>
              <For
                each={app.stocks}
                render={(stock) => (
                  <li key={stock.name}>
                    <Branding stock={stock} />
                    <When
                      value={stock.values?.[0]}
                      render={(latest) => (
                        <section>
                          <h6>{latest.low}</h6>
                          <h4>{latest.open}</h4>
                          <h6>{latest.high}</h6>
                        </section>
                      )}
                      else={() => (
                        <section>
                          <h4>No Data</h4>
                        </section>
                      )}
                    />
                  </li>
                )}
              />
            </ul>
          </main>

          <When
            value={app.activeTicker}
            render={(ticker) => (
              <StockDetails
                ticker={ticker}
                onClose={() => (app.activeTicker = null)}
              />
            )}
          />
        </div>
      </>
    );
  }, []);
}
