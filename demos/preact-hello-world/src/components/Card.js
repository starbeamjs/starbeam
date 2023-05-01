import { jsx as _jsx } from "preact/jsx-runtime";
import "preact";
export default function Card({ children, class: className, }) {
    const classes = ["card"];
    if (className)
        classes.push(className);
    return _jsx("div", { class: classes.join(" "), children: children });
}
