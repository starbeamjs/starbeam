import type { Stock } from "../lib/api/interfaces.js";
import { STOCK_API_TOKEN } from "../lib/env.js";

export function Branding({ stock }: { stock: Stock }) {
  if (stock.branding) {
    return <img src={`${stock.branding.logo_url}?apiKey=${STOCK_API_TOKEN}`} />;
  } else {
    return <p>{stock.name}</p>;
  }
}
