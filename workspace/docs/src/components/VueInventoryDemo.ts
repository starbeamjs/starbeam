import App from "@starbeam-demos/table-vue/src/App.js";
import { defineComponent, h } from "vue";

export default defineComponent({
  name: "VueInventoryDemo",
  setup() {
    return () => h(App);
  },
});
