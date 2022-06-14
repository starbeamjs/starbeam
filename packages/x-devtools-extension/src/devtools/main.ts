import logo from "../../assets/logo.svg";
import debug from "../coordination/debug.js?script";
import { type MessageFromSW, Chrome } from "../types.js";

Chrome.devtools.panels.create("Starbeam", logo, "src/panes/main/index.html");

const sw = Chrome.runtime.connect(undefined, { name: "devtools-sw" });

sw.onMessage.addListener((message: MessageFromSW) => {
  console.log("received message from SW!", message);
});

sw.postMessage({
  type: "starbeam:connect",
  tabId: Chrome.devtools.inspectedWindow.tabId,
  script: debug,
});

// Chrome.runtime.onConnect.addListener(connection => {
//   const listener = (message: ConnectMessage, port: chrome.runtime.Port) => {
//     chrome.scripting.executeScript({
//       target: { tabId: message.tabId },
//       files: [message.script]
//     });
//   };

//   connection.onMessage.addListener(listener);

//   connection.onDisconnect.addListener(() => {
//     connection.onMessage.removeListener(listener);
//   });
// });

export {};
