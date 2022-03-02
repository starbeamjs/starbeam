import { reactive } from "@starbeam/core";
import {
  createPerson,
  formatPerson,
  SYSTEM_LOCALE,
} from "./2-justjs.quokka.js";

const session = reactive({
  locale: SYSTEM_LOCALE,
});

const wycats = createPerson("Yehuda Katz", [1982, 5, 10]);

const formattedWycats = reactive(() => formatPerson(wycats, session.locale));

formattedWycats; //? $.current

session.locale = "en-GB";

formattedWycats; //? $.current

session.locale = "de-DE";

formattedWycats; //? $.current
