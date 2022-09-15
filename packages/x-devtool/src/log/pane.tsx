/** @jsxRuntime automatic @jsxImportSource preact */

import { type ComponentChildren, type JSX, render } from "preact";

export interface UpdatePane<P> {
  update: (props?: Partial<P>) => void;
}

export function Pane<Props>(
  into: Element,
  {
    Component,
    props,
    css,
  }: {
    Component: (props: Props) => JSX.Element | null;
    props: Props;
    css: string;
  }
): UpdatePane<Props> {
  const app = <Component {...(props as Props & JSX.IntrinsicAttributes)} />;
  let shadow = into.shadowRoot;

  if (!shadow) {
    const font = document.createElement("style");
    const fonts = [
      `https://fonts.googleapis.com/css2?family=Roboto+Flex:opsz,slnt,wdth,wght,GRAD,XTRA,YTAS,YTDE@8..144,-10..0,25..151,100..1000,-200..150,323..603,649..854,-305..-98&display=swap`,
      `https://fonts.googleapis.com/css2?family=Roboto+Mono:ital,wght@0,100..700;1,100..700&display=swap`,
      `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200`,
    ];
    font.textContent = fonts
      .map((font) => `@import url(${JSON.stringify(font)});`)
      .join("\n");
    document.body.appendChild(font);

    shadow = into.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = css;
    shadow.appendChild(style);
  }

  render(app, shadow);

  return {
    update: (newProps?: Partial<Props>) => {
      const updatedProps = { ...props, ...newProps };
      render(<Component {...updatedProps} />, into);
    },
  };
}

export function UiPane({
  children,
}: {
  children?: ComponentChildren;
}): JSX.Element {
  return (
    <>
      <section class="pane">{children}</section>
    </>
  );
}
