import "@starbeamx/devtool";

import * as ReactDOM from "react-dom/client";

import App from "./components/App.jsx";

// const dev = devtool();

const container = document.querySelector("#root") as Element;
const root = ReactDOM.createRoot(container);
root.render(<App />);
