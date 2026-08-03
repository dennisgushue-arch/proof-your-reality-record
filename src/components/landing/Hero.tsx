import { Link } from "react-router-dom";
import { ArrowRight, CirclePlay, Download, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardMockup from "@/components/landing/DashboardMockup";

const trustPoints = [
  { icon: Lock, label: "Private by design" },
  { icon: Sparkles, label: "AI-assisted organization" },
  { icon: Download, label: "Export when needed" },
];

const Hero = () => {
  return (
    <section className="relative isolate overflow-x-clip overflow-y-visible border-b border-blue-300/15 bg-[#050D19] text-[#F8FAFC]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(96,165,250,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(96,165,250,0.1)_1px,transparent_1px)] [background-size:36px_36px] [mask-image:linear-gradient(to_bottom,black,transparent_92%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-[-8%] w-[68%] bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.42)_0%,rgba(14,165,233,0.16)_34%,transparent_70%)] motion-safe:animate-pulse motion-reduce:animate-none"
      />
      <div aria-hidden="true" className="pointer-events-none absolute -left-[16%] top-[4%] h-[55%] w-[58%] bg-[radial-gradient(ellipse_at_center,rgba(29,78,216,0.18)_0%,transparent_68%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(2,6,23,0.72)_100%)]" />

      <div className="relative mx-auto grid w-full max-w-[1440px] gap-9 px-5 py-10 sm:px-8 sm:py-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-10 lg:px-10 lg:py-10 xl:grid-cols-[0.85fr_1.15fr] xl:gap-12 xl:px-12">
        <div className="relative z-10 min-w-0 max-w-[660px] overflow-visible">
          <p className="mb-3 flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.19em] text-blue-300 sm:text-[15px]">
            <ShieldCheck className="h-5 w-5 shrink-0 text-sky-300" aria-hidden="true" />
            Private incident &amp; evidence record
          </p>
          <h1 className="break-normal whitespace-normal overflow-visible pb-[0.08em] text-[3.4rem] font-black leading-[0.94] tracking-[-0.045em] text-white sm:text-[4.5rem] lg:text-[5rem] xl:text-[5.8rem] 2xl:text-[6.4rem]">
            When{" "}
            <span className="inline overflow-visible bg-gradient-to-r from-blue-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent">details</span>{" "}
            matter,
            <br className="hidden sm:block" />
            <span className="sm:hidden"> </span>
            preserve{" "}
            <span className="inline overflow-visible bg-gradient-to-r from-blue-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent">what happened.</span>
          </h1>
          <p className="mt-5 max-w-[600px] text-pretty text-lg leading-7 text-slate-300 sm:text-xl sm:leading-8 lg:mt-6">
            Build a clear, organized record of incidents, evidence, people, and timelines—while the details are still
            fresh.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button asChild className="h-14 rounded-xl border border-blue-300/30 bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] px-8 text-base font-bold text-white shadow-[0_14px_38px_-10px_rgba(37,99,235,0.85)] transition-all hover:-translate-y-1 hover:from-[#3B82F6] hover:to-[#38BDF8] hover:shadow-[0_20px_46px_-12px_rgba(37,99,235,0.95)] motion-reduce:transform-none">
              <Link to="/auth?mode=signup">Start Documenting <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" /></Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-14 rounded-xl border-white/25 bg-[#101C2C]/90 px-8 text-base font-bold text-[#F8FAFC] shadow-lg shadow-black/20 transition-all hover:-translate-y-1 hover:border-blue-300/50 hover:bg-[#172A42] hover:text-white motion-reduce:transform-none"
            >
              <a href="#how-it-works"><CirclePlay className="mr-2 h-5 w-5 text-blue-300" aria-hidden="true" /> See How It Works</a>
            </Button>
          </div>

          <ul className="mt-6 flex flex-wrap gap-y-4 text-slate-200">
            {trustPoints.map((point, index) => (
              <li key={point.label} className={`flex items-center gap-2.5 pr-4 sm:pr-5 ${index > 0 ? "sm:border-l sm:border-blue-200/20 sm:pl-5" : ""}`}>
                <point.icon className="h-5 w-5 shrink-0 text-sky-400" aria-hidden="true" />
                <span className="text-sm font-bold leading-tight sm:text-[15px]">{point.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative w-full min-w-0 overflow-visible py-6 lg:z-10 lg:py-10 lg:pr-4 xl:pr-8">
          <div aria-hidden="true" className="pointer-events-none absolute -inset-[10%] -z-10 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.44)_0%,rgba(14,165,233,0.16)_38%,transparent_72%)] blur-2xl" />
          <DashboardMockup />
        </div>
      </div>
    </section>
  );
};

export default Hero;
