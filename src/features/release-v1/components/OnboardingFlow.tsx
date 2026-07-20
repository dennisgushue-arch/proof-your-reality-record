import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { completeOnboarding, ONBOARDING_STEPS, ONBOARDING_STORAGE_KEY, serializeOnboardingState } from "../releaseUtils";
import type { FirstRunAction, OnboardingStepId } from "../types";
import { FirstRecordStep } from "./FirstRecordStep";
import { OnboardingProgress } from "./OnboardingProgress";
import { PrivacyStep } from "./PrivacyStep";
import { UseCaseStep } from "./UseCaseStep";
import { WelcomeStep } from "./WelcomeStep";

type OnboardingFlowProps = {
  firstRunAction: FirstRunAction;
  onComplete: (skipped: boolean) => void;
};

export const OnboardingFlow = ({ firstRunAction, onComplete }: OnboardingFlowProps) => {
  const [step, setStep] = useState<OnboardingStepId>("welcome");
  const currentIndex = ONBOARDING_STEPS.indexOf(step);
  const isLast = currentIndex === ONBOARDING_STEPS.length - 1;

  const content = useMemo(() => {
    if (step === "use-case") return <UseCaseStep />;
    if (step === "privacy") return <PrivacyStep />;
    if (step === "first-record") return <FirstRecordStep action={firstRunAction} />;
    return <WelcomeStep />;
  }, [firstRunAction, step]);

  const persistCompletion = (skipped: boolean) => {
    try {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, serializeOnboardingState(completeOnboarding(skipped)));
    } catch {
      // Local completion is a convenience only; do not block first-run flow if storage is unavailable.
    }
    onComplete(skipped);
  };

  return (
    <section className="rounded-[32px] border border-blue-300/10 bg-[#0D1420] p-5 shadow-[0_24px_70px_-50px_rgba(59,130,246,0.9)] sm:p-8" aria-labelledby="onboarding-title">
      <OnboardingProgress currentStep={step} />
      <div id="onboarding-title" className="mt-6">{content}</div>
      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={() => persistCompletion(true)} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
          Skip for now
        </button>
        <div className="flex gap-3">
          <Button type="button" variant="outline" disabled={currentIndex === 0} onClick={() => setStep(ONBOARDING_STEPS[currentIndex - 1])} className="rounded-xl border-white/10 bg-white/[0.02]">
            Back
          </Button>
          {isLast ? (
            <Button asChild className="rounded-xl bg-blue-500 font-bold hover:bg-blue-400" onClick={() => persistCompletion(false)}>
              <Link to={firstRunAction.href}>{firstRunAction.label}</Link>
            </Button>
          ) : (
            <Button type="button" onClick={() => setStep(ONBOARDING_STEPS[currentIndex + 1])} className="rounded-xl bg-blue-500 font-bold hover:bg-blue-400">
              Continue
            </Button>
          )}
        </div>
      </div>
    </section>
  );
};
