export function escapeAttrValue(value: string): string {
  return value.replace(/"/g, `&quot;`);
}

export function escapeTextValue(value: string): string {
  return value.replace(/</g, `&lt;`);
}

export function escapeCommentValue(value: string): string {
  // These characters cause the tokenizer to leave the (collection of) comment states.
  return value.replace(/-/g, "&dash;").replace(/>/g, "&gt;");
}
