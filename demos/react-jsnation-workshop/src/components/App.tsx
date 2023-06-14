import { StrictMode } from "react";

import { useHash } from "./shared/hooks.js";
import Step1 from "./steps/Step1";
import Step2 from "./steps/Step2";
import Step3 from "./steps/Step3.js";

const STEPS = [Step1, Step2, Step3];

export default function App(): JSX.Element {
  const step = useStep(0);

  return (
    <StrictMode>
      <header className="p-navigation">
        <nav className="p-navigation__nav">
          <ul className="p-navigation__items">
            <step.button step={0} />
            <step.button step={1} />
            <step.button step={2} />
          </ul>
        </nav>
      </header>

      <main className="p-card">
        <section className="p-card__content">
          <step.component />
        </section>
      </main>
    </StrictMode>
  );
}

function useStep(initialStep: number) {
  const [currentStep] = useHash(String(initialStep));
  const currentStepIndex = Number(currentStep);

  return {
    component: STEPS[currentStepIndex] as () => JSX.Element,
    button: ({ step }: { step: number }) => (
      <Step step={step} currentStep={currentStepIndex} />
    ),
  };
}

function Step({
  step,
  currentStep,
}: {
  step: number;
  currentStep: number;
}): JSX.Element {
  return (
    <li
      className={`p-navigation__item ${
        currentStep === step ? "is-selected" : ""
      }`}
    >
      <a href={`#${step}`} className={`p-navigation__link`}>
        Step {step + 1}
      </a>
    </li>
  );
}
