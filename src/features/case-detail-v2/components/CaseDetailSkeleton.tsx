const PulseBlock = ({ className }: { className: string }) => <div className={`animate-pulse rounded-2xl bg-white/[0.06] ${className}`} />;

export const CaseDetailSkeleton = () => {
  return (
    <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <div className="mb-6 space-y-3">
        <PulseBlock className="h-3 w-28" />
        <PulseBlock className="h-12 w-[32rem] max-w-full" />
        <PulseBlock className="h-4 w-[44rem] max-w-full" />
      </div>

      <section className="rounded-[32px] bg-[#0B111A] p-6 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PulseBlock className="h-20 w-full" />
          <PulseBlock className="h-20 w-full" />
          <PulseBlock className="h-20 w-full" />
          <PulseBlock className="h-20 w-full" />
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <PulseBlock className="h-[360px] w-full rounded-[32px]" />
        <PulseBlock className="h-[360px] w-full rounded-[32px]" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.86fr]">
        <PulseBlock className="h-64 w-full rounded-[32px]" />
        <PulseBlock className="h-64 w-full rounded-[32px]" />
      </div>
    </main>
  );
};
