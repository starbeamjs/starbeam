import { STOCK_API_TOKEN } from "../env.js";
import { yesterday } from "../formatting.js";
import type { Stock } from "./interfaces.js";
export const STOCK_API_PATH = "https://api.polygon.io";

const SearchTickerPath = `${STOCK_API_PATH}/v3/reference/tickers`;
const TickerDetailsPath = `${STOCK_API_PATH}/v3/reference/tickers`;
const DailyValuesPath = `${STOCK_API_PATH}/v1/open-close`;

export function searchTicker(ticker: string): Promise<Response> {
  ticker = ticker.toUpperCase();
  return fetch(
    `${SearchTickerPath}?ticker=${ticker}&apiKey=${STOCK_API_TOKEN}`
  );
}

export async function getTickerDetails(ticker: string): Promise<Stock> {
  ticker = ticker.toUpperCase();
  const resp = await fetch(
    `${TickerDetailsPath}/${ticker}?apiKey=${STOCK_API_TOKEN}`
  );
  return (await resp.json()).results;
}

export function getDailyValues(ticker: string, stamp = ""): Promise<Response> {
  ticker = ticker.toUpperCase();
  if (!stamp) {
    stamp = yesterday();
  }
  return fetch(
    `${DailyValuesPath}/${ticker}/${stamp}?apiKey=${STOCK_API_TOKEN}`
  );
}
