import { useState } from "react";

import Card from "./Card.jsx";
import DataTable from "./DataTable.jsx";
import { formatLocale, LOCALES, SYSTEM_LOCALE } from "./intl.js";

export default function App(): JSX.Element {
  const [locale, setLocale] = useState(SYSTEM_LOCALE);

  const LocaleSelector = () => (
    <div className="header">
      <label>
        <span>My Locale</span>
        <select
          value={locale}
          onInput={(e) => setLocale(e.currentTarget.value)}
        >
          {LOCALES.map((l) => (
            <option key={l} value={l}>
              {formatLocale(l).full}
            </option>
          ))}
        </select>
      </label>
    </div>
  );

  return (
    <>
      <LocaleSelector />
      <main>
        <Card>
          <DataTable locale={locale} />
        </Card>
      </main>
    </>
  );
}
