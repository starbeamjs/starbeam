import { useReactive } from "@starbeam/react";
import { useEffect } from "react";

import styles from "./App.module.scss";
import { Branding } from "./components/Branding.jsx";
import Header from "./components/Header.jsx";
import { StockDetails } from "./components/StockDetails.jsx";
import { For, When } from "./lib/utils.jsx";
import { app } from "./store.js";

export default function App(): JSX.Element {
  useEffect(() => {
    const stocks = localStorage.getItem("stocks");

    if (!stocks) {
      return;
    }

    app.stocks = JSON.parse(stocks);
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
  });
}
