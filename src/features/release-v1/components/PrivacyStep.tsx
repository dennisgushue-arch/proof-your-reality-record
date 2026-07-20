import { TRUST_COPY } from "../releaseUtils";

export const PrivacyStep = () => (
  <div>
    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">Privacy and AI</p>
    <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-white">You control what gets recorded and shared.</h2>
    <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-400">
      <li>• {TRUST_COPY.privateByDesign}</li>
      <li>• {TRUST_COPY.aiReview}</li>
      <li>• {TRUST_COPY.noLegalAdvice}</li>
    </ul>
  </div>
);
