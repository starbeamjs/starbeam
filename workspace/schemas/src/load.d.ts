export function loadJSON<T>(file: string, schema: string): T;
export function loadToml<T>(file: string, schema: string): T;
export function validate<T>(object: object, schema: string): T;
