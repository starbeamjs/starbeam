export function escapeAttrValue(value) {
    return value.replace(/"/g, `&quot;`);
}
export function escapeTextValue(value) {
    return value.replace(/</g, `&lt;`);
}
export function escapeCommentValue(value) {
    // These characters cause the tokenizer to leave the (collection of) comment states.
    return value.replace(/-/g, "&dash;").replace(/>/g, "&gt;");
}
//# sourceMappingURL=escape.js.map