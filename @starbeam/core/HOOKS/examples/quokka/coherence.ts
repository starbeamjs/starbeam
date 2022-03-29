import { computed, reactive } from "@starbeam/core";

const person = reactive({
  name: "Tom Dale",
  username: "@tomdale",
  country: "United States",
});

const description = computed(
  () => `${person.name} (${person.username}) in ${person.country}`
);

description.current; //?
// Tom Dale (@tomdale) in United State

person.name = "Thomas Dale";

description.current; //?
// Thomas Dale (@tomdale) in United States

person.username = "@todale";
person.country = "Parts Unknown";

description.current; //?
// Thomas Dale (@todale) in Parts Unknown
