import { reactive } from "@starbeam/core";
import { display } from "./quokka-shim.js";

interface Conf {
  readonly id: string;
  readonly name: string;
  readonly date: [year: number, month: number, date: number];
  readonly location: string;
  readonly url: string;
}

const confs: Conf[] = reactive([
  {
    id: "svelte-summit",
    name: "Svelte Summit, Spring",
    date: [2021, 4, 25],
    location: "virtual",
    url: "https://sveltesociety.dev/events/2021-summit-spring/",
  },
  {
    id: "svelte-summit",
    name: "Svelte Summit, Fall",
    date: [2021, 11, 20],
    location: "virtual",
    url: "https://sveltesociety.dev/events/2021-summit-fall/",
  },
  {
    id: "reactconf",
    name: "ReactConf",
    date: [2021, 12, 8],
    location: "virtual",
    url: "https://conf.reactjs.org/",
  },
  {
    id: "emberconf",
    name: "EmberConf",
    date: [2021, 3, 29],
    location: "virtual",
    url: "https://2021.emberconf.com/",
  },
  {
    id: "jsconf",
    name: "JSConf Budapest",
    year: 2022,
    date: [2022, 6, 2],
    location: "Budapest",
    url: "https://jsconfbp.com/",
  },
  {
    id: `reactlive${"1"}`,
    name: "React Conference Live",
    year: 2022,
    date: [2022, 4, 1],
    location: "Amsterdam",
    url: "https://reactlive.nl/",
  },
]);

const SYSTEM_LOCALE = new Intl.DateTimeFormat().resolvedOptions().locale; //?

const session = reactive({
  year: 2021,
  name: "Jane Thoughtleader",
  locale: SYSTEM_LOCALE,
});

const describe = (conf: Conf): string => {
  const [year, month, date] = conf.date;
  const formatted = new Intl.DateTimeFormat(session.locale).format(
    new Date(year, month + 1, date)
  );

  const at = conf.location === "virtual" ? "virtual" : `in ${conf.location}`;

  return `${conf.name} (${formatted}, ${at})`;
};

describe(confs[0]); //?

confs.map(describe); //?

const described = reactive(() => confs.map(describe));

described.current; //?

session.locale = "en-GB";

described.current; //?

// this year's conferences
const confsThisYear = reactive(
  () => confs.filter((talk) => talk.date[0] === session.year),
  "confs this year"
);

confsThisYear.current; //?+

// session.year = 2021;

display(confsThisYear); //?

const confsById = (id: string) => {
  return confs.filter((talk) => talk.id === id);
};

const svelteSummits = reactive(
  () => confsById("svelte-summit"),
  "svelte summits"
);

// svelteSummits.current.map(s => )
