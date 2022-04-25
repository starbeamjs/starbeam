import { reactive } from "@starbeam/core";

const counter = reactive({ count: 0 }, { as: "counter" }); //??
const description = reactive(() => `[${counter.count}]`, { as: "description" });

description; //? $.current

counter.count++;

counter; //?

description.current; //?
