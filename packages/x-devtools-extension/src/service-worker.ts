import { type ConnectMessage, Chrome } from "./types.js";

Chrome.runtime.onConnect.addListener((connection) => {
  const listener = (
    message: ConnectMessage
    // port: chrome.runtime.Port
  ) => {
    if (message.type !== "starbeam:connect") {
      console.debug("[SW] received unknown message", message);
      return;
    }

    console.log("[SW] received message from", message);
    Chrome.scripting
      .executeScript({
        target: { tabId: message.tabId },
        files: [message.script],
        injectImmediately: true,
      })
      .catch((e) => console.error(e));
  };

  connection.onMessage.addListener(listener);

  connection.onDisconnect.addListener(() => {
    connection.onMessage.removeListener(listener);
  });
});

export {};
