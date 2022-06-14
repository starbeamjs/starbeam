/** @jsx h */
/** @jsxFrag Fragment */
// eslint-disable-next-line
import { h, Fragment, render } from "preact";

const app = <div>Hi</div>;

render(app, document.querySelector("#tool") as Element);
