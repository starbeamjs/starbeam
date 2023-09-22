import { StrictMode } from "react";

import { useHash } from "./shared/hooks.js";
import Step1 from "./steps/Step1-0.js";
import Step1_1 from "./steps/Step1-1.js";
import Step1_2 from "./steps/Step1-2.js";
import Step1_3 from "./steps/Step1-3.js";
import Step2 from "./steps/Step2.js";
import Step3 from "./steps/Step3.js";
import Step4 from "./steps/Step4.js";
import Step5 from "./steps/Step5.js";
import Step6 from "./steps/Step6.js";

const STEPS = [
  Step1,
  Step1_1,
  Step1_2,
  Step1_3,
  Step2,
  Step3,
  Step4,
  Step5,
  Step6,
];

export default function App(): JSX.Element {
  const step = useStep(0);

  return (
    <StrictMode>
      <header className="p-navigation">
        <nav className="p-navigation__nav">
          <ul className="p-navigation__items">
            <step.button step={0} name="Step 1" />
            <step.button step={1} name="Step 1.1" />
            <step.button step={2} name="Step 1.2" />
            <step.button step={3} name="Step 1.3" />
            <step.button step={4} name="Step 2" />
            <step.button step={5} name="Step 3" />
            <step.button step={6} name="Step 4" />
            <step.button step={7} name="Step 5" />
            <step.button step={8} name="Step 6" />
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
    button: ({ step, name }: { step: number; name: string }) => (
      <Step step={step} name={name} currentStep={currentStepIndex} />
    ),
  };
}

function Step({
  step,
  name,
  currentStep,
}: {
  step: number;
  name: string;
  currentStep: number;
}): JSX.Element {
  return (
    <li
      className={`p-navigation__item ${
        currentStep === step ? "is-selected" : ""
      }`}
    >
      <a href={`#${step}`} className={`p-navigation__link`}>
        {name ?? `Step ${step + 1}`}
      </a>
    </li>
  );
}
