import * as ReactDOM from "react-dom/client";

import App from "./components/App.jsx";

const container = document.querySelector("#root");

if (!container) {
  throw Error("Could not find #root");
}

const root = ReactDOM.createRoot(container);

root.render(<App />);
