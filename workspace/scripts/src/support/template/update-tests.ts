import { UpdatePackageFn } from "./updates.js";

export const updateTests = UpdatePackageFn((update) => {
  update.json("package.json", (prev) => {
    delete prev["publishConfig"];
    delete prev["private"];

    return {
      private: true,
      ...prev,
    };
  });
});
