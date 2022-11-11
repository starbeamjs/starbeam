import type { JSX } from "preact";
import { useState } from "preact/hooks";

import Card from "./Card.jsx";
import Databasev1 from "./db/Db-1.jsx";
import Databasev2 from "./db/Db-2.jsx";
import Databasev3 from "./db/Db-3.jsx";
import Databasev4 from "./db/Db-4.jsx";
import DatabaseFinal from "./db/Db-final.jsx";
import DateFormatterv1 from "./formatter/DateFormatter-v1.jsx";
import DateFormatterv2 from "./formatter/DateFormatter-v2.jsx";
import DateFormatterv3 from "./formatter/DateFormatter-v3.jsx";
import { formatLocale, LOCALES, SYSTEM_LOCALE } from "./intl.js";

export default function App(): JSX.Element {
  const [locale, setLocale] = useState(SYSTEM_LOCALE);

  const LocaleSelector = (): JSX.Element => (
    <div className="header">
      <label>
        <span>My Locale</span>
        <select
          defaultValue={locale}
          onInput={(e) => {
            setLocale(e.currentTarget.value);
          }}
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
          <Databasev1 />
        </Card>
        <Card>
          <Databasev2 />
        </Card>
        <Card>
          <Databasev3 />
        </Card>
        <Card>
          <Databasev4 />
        </Card>
        <Card>
          <DatabaseFinal locale={locale} />
        </Card>
        {/* <Card>
          <h1>Final</h1>
          <DateFormatterFinal locale={locale} />
        </Card> */}

        <Card>
          <h1>v3</h1>
          <DateFormatterv3 />
        </Card>
        <Card>
          <h1>v2</h1>
          <DateFormatterv2 />
        </Card>
        <Card>
          <h1>v1</h1>
          <DateFormatterv1 />
        </Card>
      </main>
    </>
  );
}
