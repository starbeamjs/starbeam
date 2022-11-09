/** @jsx h */
/** @jsxFrag Fragment */
 
import { h, Fragment, render } from "preact";

const app = <div>Hi</div>;

render(app, document.querySelector("#tool") as Element);
