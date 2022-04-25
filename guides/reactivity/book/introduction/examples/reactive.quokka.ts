import { reactive } from "@starbeam/core";

const tom = reactive({ name: "@tomdale" });

const name = reactive("@tomdale");

const tomName = reactive(() => name.current.toUpperCase());
tomName.current; //?

const map = reactive(Map); //?
