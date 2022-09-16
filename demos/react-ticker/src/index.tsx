import "@starbeamx/devtool";
import "./index.scss";

import * as ReactDOM from "react-dom/client";

import App from "./App.jsx";

// const dev = devtool();

const container = document.querySelector("#root") as Element;
const root = ReactDOM.createRoot(container);
root.render(<App />);
