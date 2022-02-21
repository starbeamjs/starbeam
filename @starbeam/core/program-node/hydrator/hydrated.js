export const Hydrated = {
    range(start, end) {
        return { type: "range", range: [start, end] };
    },
    node(node) {
        return { type: "node", node };
    },
    attr(attr) {
        return { type: "attr", attr };
    },
};
//# sourceMappingURL=hydrated.js.map