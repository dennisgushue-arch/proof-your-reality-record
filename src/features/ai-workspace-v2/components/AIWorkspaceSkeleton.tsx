export const AIWorkspaceSkeleton = () => (
  <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10" aria-label="Loading Proof AI workspace">
    <div className="h-56 animate-pulse rounded-[2rem] border border-white/[0.06] bg-[#0B111A]" />
    <div className="mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
      <div className="h-96 animate-pulse rounded-3xl border border-white/[0.06] bg-[#0B111A]" />
      <div className="h-[680px] animate-pulse rounded-3xl border border-white/[0.06] bg-[#0B111A]" />
      <div className="h-96 animate-pulse rounded-3xl border border-white/[0.06] bg-[#0B111A]" />
    </div>
  </div>
);
