import type { OnboardingStepId } from "../types";
import { ONBOARDING_STEPS } from "../releaseUtils";

type OnboardingProgressProps = {
  currentStep: OnboardingStepId;
};

export const OnboardingProgress = ({ currentStep }: OnboardingProgressProps) => {
  const currentIndex = ONBOARDING_STEPS.indexOf(currentStep);
  const value = ((currentIndex + 1) / ONBOARDING_STEPS.length) * 100;

  return (
    <div aria-label="Onboarding progress">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
        <span>Step {currentIndex + 1} of {ONBOARDING_STEPS.length}</span>
        <span>{Math.round(value)}%</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-white/[0.06]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)}>
        <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
};
