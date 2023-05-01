import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "preact/jsx-runtime";
import { createCell, useResource, useService } from "@starbeam/preact";
import { Cell, Resource } from "@starbeam/universal";
import { useState } from "preact/hooks";
import Card from "./Card.jsx";
export default function App() {
    const counter = useResource(Count);
    const [showChild, setShowChild] = useState(true);
    const cell = createCell(0, "cell");
    const CounterService = CounterWithCleanup();
    const resourceStatus = createCell("idle", "resourceStatus");
    function isIdle() {
        return resourceStatus.current === "idle";
    }
    function toggle() {
        if (isIdle()) {
            setShowChild(false);
        }
        else {
            setShowChild(true);
        }
    }
    const child = showChild ? (_jsxs(_Fragment, { children: [_jsx("hr", {}), " ", _jsx(UsingCounterResource, { status: resourceStatus })] })) : null;
    return (_jsxs("div", { class: "cards", children: [_jsxs(Card, { children: [_jsxs("h1", { children: ["Counter (using ", _jsx("code", { children: "Cell" }), ")"] }), _jsxs("p", { children: ["Count: ", cell] }), _jsx("button", { onClick: () => cell.current++, children: "++" })] }), _jsxs(Card, { children: [_jsxs("h1", { children: ["Counter (using ", _jsx("code", { children: "create" }), ")"] }), _jsx(Counter, { counter: counter })] }), _jsx("hr", {}), _jsx("h2", { children: "Resource" }), _jsxs(Card, { class: "wide", children: [_jsx("button", { onClick: toggle, children: isIdle() ? "Clean up resource" : "Create resource" }), _jsxs("p", { children: ["When the resource is ", _jsx("strong", { children: "enabled" }), ", both boxes below will show the status ", _jsx("code", { children: "idle" }), " and a counter."] }), _jsxs("p", { children: ["When it is ", _jsx("strong", { children: "disabled" }), ", both boxes below will show the status ", _jsx("code", { children: "cleaned up" }), " and nothing else."] })] }), _jsxs(Card, { children: [_jsx("h1", { children: "A resource" }), _jsxs("p", { children: ["status: ", resourceStatus] }), child] }), _jsxs(Card, { children: [_jsx("h1", { children: "A resource" }), _jsxs("p", { children: ["status: ", resourceStatus] }), child] }), _jsx("hr", {}), _jsx("h2", { children: "Services" }), _jsxs("p", { children: ["A service is a ", _jsx("em", { children: "resource" }), " that is only created once per application by using ", _jsx("code", { children: "service()" }), "."] }), _jsxs("p", { children: ["The first time ", _jsx("code", { children: "service" }), " is called with a particular blueprint, the service is instantiated. After that point, the same service is returned."] }), _jsx("hr", {}), _jsx("h3", { children: "Stateful Services" }), _jsx("p", { children: "A stateful service has data, but no cleanup." }), _jsx(Card, { class: "start", children: _jsx(UsingCounterService, { name: "pure", Service: Count }) }), _jsx(Card, { children: _jsx(UsingCounterService, { name: "pure", Service: Count }) }), _jsx("hr", {}), _jsx("h2", { children: "Resourceful Services" }), _jsx("p", { children: "A stateful service has data and cleanup." }), _jsx(Card, { class: "start", children: _jsx(UsingCounterService, { name: "resourceful", Service: CounterService }) }), _jsx(Card, { children: _jsx(UsingCounterService, { name: "resourceful", Service: CounterService }) })] }));
}
function UsingCounterService({ name, Service, }) {
    const counter = useService(Service);
    return (_jsxs(_Fragment, { children: [_jsx("h1", { children: "Counter" }), _jsxs("h2", { children: ["Using ", name, " service"] }), _jsx(Counter, { counter: counter })] }));
}
function UsingCounterResource({ status, }) {
    const counter = useResource(CounterWithCleanup(status));
    status.set("idle");
    return (_jsxs(_Fragment, { children: [_jsx("h2", { children: "Child" }), _jsxs("h3", { children: ["status: ", status.current] }), _jsx(Counter, { counter: counter })] }));
}
function Counter({ counter }) {
    return (_jsxs(_Fragment, { children: [_jsxs("p", { children: ["Count: ", counter.count] }), _jsx("button", { onClick: counter.increment, children: "++" })] }));
}
const Count = Resource(() => {
    const count = Cell(0, "data count");
    return {
        get count() {
            return count.current;
        },
        increment: () => {
            count.current++;
        },
    };
});
function CounterWithCleanup(status = Cell("new")) {
    return Resource(({ on }) => {
        const count = Cell(0, "resource count");
        on.cleanup(() => {
            status.set("cleaned up");
        });
        return {
            get count() {
                return count.current;
            },
            increment: () => {
                count.current++;
            },
        };
    }, "CounterWithCleanup");
}
