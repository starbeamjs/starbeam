import { UNINITIALIZED } from "@starbeam/shared";
import { LIFETIME } from "@starbeam/timeline";
import { useLifecycle } from "@starbeam/use-strict-lifecycle";
import type { FunctionComponent } from "react";
import {
  type PropsWithChildren,
  createContext,
  createElement,
  useContext,
} from "react";

const StarbeamContext = createContext(null as null | object);

// eslint-disable-next-line @typescript-eslint/ban-types
type EmptyProps = PropsWithChildren<{}>;

export const Starbeam: FunctionComponent<EmptyProps> = ({ children }) => {
  const owner = useLifecycle(({ on }) => {
    let owner = {};

    on.cleanup(() => {
      LIFETIME.finalize(owner);
      owner = {};
    });

    on.update(() => owner);

    return owner;
  });

  return createElement(StarbeamContext.Provider, {
    value: owner === UNINITIALIZED ? null : owner,
    children,
  });
};

export function useStarbeamApp({ feature }: { feature: string }): object {
  const app = useContext(StarbeamContext);

  if (app === null) {
    throw Error(
      `You are attempting to use a feature of Starbeam (${feature}) that depends on the current app, but you didn't wrap your application in the \`Starbeam\` component.`
    );
  }

  return app;
}
