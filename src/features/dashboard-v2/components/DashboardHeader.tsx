type DashboardHeaderProps = {
  greeting: string;
  userDisplayName: string;
};

export const DashboardHeader = ({ greeting, userDisplayName }: DashboardHeaderProps) => {
  return (
    <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300">
          Intelligence Briefing
        </p>
        <h1 className="text-3xl font-black tracking-[-0.045em] text-white sm:text-4xl lg:text-5xl">
          {greeting}, {userDisplayName}.
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 sm:text-base">
          Proof reviewed your records and prioritized the next action most likely to strengthen documentation.
        </p>
      </div>

      <div
        aria-label="Private account workspace"
        className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300"
      >
        <span aria-hidden className="h-2 w-2 rounded-full bg-emerald-300" />
        Private · Account-scoped
      </div>
    </header>
  );
};
