type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

type Colors =
  | "Black"
  | "Red"
  | "Green"
  | "Yellow"
  | "Blue"
  | "Magenta"
  | "Cyan"
  | "White"
  | "Default";

type Styles = "bright" | "dim" | "italic" | "underline" | "inverse";

type Bg = `bg${"Bright" | ""}${Colors}`;

type BgColor = Expand<{
  [key in Colors]: Color;
}>;

type FgColor = Expand<{
  bright: Color;
  dim: Color;
  italic: Color;
  underline: Color;
  inverse: Color;
  dim: Color;
  magenta: Color;
  black: Color;
  red: Color;
  green: Color;
  yellow: Color;
  blue: Color;
  magenta: Color;
  cyan: Color;
  white: Color;
  default: Color;
}>;

type Color = BgColor & FgColor & ((text: string) => string);

const DEFAULT: Color;
export default DEFAULT;
