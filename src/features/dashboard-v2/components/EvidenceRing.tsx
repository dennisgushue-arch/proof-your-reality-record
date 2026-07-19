type EvidenceRingProps = {
  score: number;
  incidentCount: number;
};

export const EvidenceRing = ({ score, incidentCount }: EvidenceRingProps) => {
  const clamped = Math.max(0, Math.min(100, score));

  return (
    <div className="relative mx-auto flex h-[260px] w-[260px] items-center justify-center sm:h-[300px] sm:w-[300px]">
      <div aria-hidden className="absolute inset-0 rounded-full border border-blue-400/20 bg-[#0a1018]" />
      <div aria-hidden className="absolute inset-5 rounded-full border border-blue-400/20" />
      <div
        aria-hidden
        className="absolute inset-5 rounded-full"
        style={{
          background: `conic-gradient(#3B82F6 ${clamped * 3.6}deg, rgba(59,130,246,0.12) ${clamped * 3.6}deg 360deg)`,
          maskImage: "radial-gradient(circle, transparent 58%, black 60%)",
          WebkitMaskImage: "radial-gradient(circle, transparent 58%, black 60%)",
        }}
      />
      <div aria-hidden className="absolute inset-10 rounded-full bg-[#0b111a] ring-1 ring-white/5" />

      <div
        role="progressbar"
        aria-label="Evidence completion"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        className="relative text-center"
      >
        <div className="text-6xl font-black tracking-[-0.07em] text-white">
          {clamped}
          <span className="ml-1 text-2xl text-blue-300">%</span>
        </div>
        <p className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Evidence complete</p>
        <p className="mt-1 text-[11px] text-slate-500">
          {incidentCount} active {incidentCount === 1 ? "incident" : "incidents"}
        </p>
      </div>
    </div>
  );
};
