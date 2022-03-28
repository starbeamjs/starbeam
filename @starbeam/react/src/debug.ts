import {
  CustomFormatter,
  registerFormatter,
  Styled,
} from "@starbeam/trace-internals";
import { isValidElement, type ReactElement } from "react";
import toString from "react-element-to-jsx-string";

registerFormatter(
  new (class JSXFormatter extends CustomFormatter<ReactElement> {
    match(value: unknown): value is ReactElement {
      return isValidElement(value as {} | null | undefined);
    }

    format(value: ReactElement): Styled {
      return Styled.from(
        toString(value, {
          functionValue: (f: Function): string => {
            const name = f.name;
            const string = String(f).trim();

            if (string.startsWith("class") || string.startsWith("@")) {
              return name ? `class ${name}` : `[[anonymous class]]`;
            } else if (string.startsWith("bound")) {
              const match = string.match(/^bound (.*)$/);
              return match ? `function ${match[1]}()` : `() => ...`;
            } else if (string.startsWith(`(`)) {
              return `() => ...`;
            } else if (string.startsWith(`function`)) {
              const match = string.match(
                /^(function[*]?)\s+([\p{ID_Start}$_][\p{ID_Continue}$]*)?/u
              );
              if (match && name) {
                return `${match[1]} name()`;
              } else if (match) {
                return match[2]
                  ? `${match[1]} ${match[2]}()`
                  : `[[anonymous ${match[1]}]]`;
              } else {
                return `[[anonymous function]]`;
              }
            } else if (name) {
              return `function ${name}()`;
            } else {
              return `[[anonymous function]]`;
            }
          },
        })
      );
    }
  })()
);
