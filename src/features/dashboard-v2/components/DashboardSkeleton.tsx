const PulseBlock = ({ className }: { className: string }) => (
  <div className={`animate-pulse rounded-2xl bg-white/[0.06] ${className}`} />
);

export const DashboardSkeleton = () => {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <div className="mb-8 space-y-3">
        <PulseBlock className="h-3 w-40" />
        <PulseBlock className="h-10 w-80" />
        <PulseBlock className="h-4 w-[36rem] max-w-full" />
      </div>

      <section className="rounded-[32px] bg-[#0D1420] p-6 sm:p-8 lg:p-10">
        <div className="grid gap-8 xl:grid-cols-[1.5fr_0.8fr] xl:items-center">
          <div className="space-y-4">
            <PulseBlock className="h-4 w-32" />
            <PulseBlock className="h-9 w-full max-w-2xl" />
            <div className="grid gap-3 sm:grid-cols-2">
              <PulseBlock className="h-20 w-full" />
              <PulseBlock className="h-20 w-full" />
              <PulseBlock className="h-20 w-full" />
              <PulseBlock className="h-20 w-full" />
            </div>
          </div>
          <PulseBlock className="mx-auto h-[280px] w-[280px] rounded-full" />
        </div>
      </section>
    </div>
  );
};
