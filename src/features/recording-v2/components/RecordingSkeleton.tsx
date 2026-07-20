const Pulse = ({ className }: { className: string }) => <div className={`animate-pulse rounded-2xl bg-white/[0.06] ${className}`} />;

export const RecordingSkeleton = () => (
  <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-10">
    <Pulse className="h-10 w-64" />
    <Pulse className="mt-6 h-96 w-full rounded-[32px]" />
    <div className="mt-6 grid gap-4 md:grid-cols-3">
      <Pulse className="h-28 w-full" />
      <Pulse className="h-28 w-full" />
      <Pulse className="h-28 w-full" />
    </div>
  </main>
);
