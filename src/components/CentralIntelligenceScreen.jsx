import { AppLayout } from "@/components/AppLayout";
import { Link } from "react-router-dom";

export default function CentralIntelligenceScreen() {
	return (
		<AppLayout>
			<main className="mx-auto w-full max-w-7xl px-6 py-10 lg:px-10 lg:py-12 space-y-8">
				<section className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-card">
					<div className="flex flex-wrap items-start justify-between gap-4 md:gap-6">
						<div>
							<p className="text-[11px] md:text-xs uppercase tracking-[0.16em] text-accent font-semibold">Reality Intelligence Platform</p>
							<h1 className="mt-2 text-3xl md:text-4xl lg:text-[2.6rem] leading-tight font-semibold">Central Intelligence Core</h1>
							<p className="mt-3 md:mt-4 text-sm md:text-base leading-relaxed text-muted-foreground max-w-2xl">
								Live conflict monitoring, evidence analysis, contradiction detection, and timeline reconstruction.
							</p>
						</div>
						<div className="flex items-center gap-2">
							<span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold text-[#E74C3C] border-[#E74C3C]/50 bg-[#E74C3C]/10">
								● 2 Active Incidents
							</span>
							<Link
								to="/stress-mode"
								className="inline-flex items-center rounded-md px-4 py-2.5 text-sm font-semibold bg-[#4F8CFF] hover:bg-[#4F8CFF]/90 text-white transition-colors"
							>
								Start Live Incident
							</Link>
						</div>
					</div>
				</section>

				<section className="grid gap-4 md:gap-5 xl:grid-cols-[1fr_1.2fr_1fr]">
					<div className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-card space-y-3">
						<p className="text-xs uppercase tracking-[0.12em] text-accent font-semibold">Reality Input Stream</p>
						{[
							["Voice Notes", "6 new recordings"],
							["Screenshots", "14 evidence uploads"],
							["Witness Statements", "3 corroborations"],
							["Live Incidents", "2 active sessions"],
						].map(([title, value]) => (
							<div key={title} className="rounded-lg border border-border bg-muted/20 p-4 md:p-5">
								<p className="text-sm font-semibold">{title}</p>
								<p className="text-xs text-muted-foreground mt-1">{value}</p>
							</div>
						))}
					</div>

					<div className="rounded-2xl border border-border bg-card p-6 md:p-7 shadow-card">
						<p className="text-xs uppercase tracking-[0.14em] text-accent font-semibold">AI Reality Engine</p>
						<h2 className="mt-2 text-2xl md:text-[1.7rem] leading-tight font-semibold">Processing Intelligence</h2>
						<div className="mt-4 space-y-2">
							{[
								"Timeline Reconstruction",
								"Contradiction Detection",
								"Behavioral Pattern Analysis",
								"Emotional Language Filtering",
								"Evidence Strength Scoring",
							].map((item) => (
								<div key={item} className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm">
									{item}
								</div>
							))}
						</div>
						<p className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#2ECC71]">
							<span className="inline-flex h-2 w-2 rounded-full bg-[#2ECC71]" />
							Reality engine active
						</p>
					</div>

					<div className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-card space-y-3">
						<p className="text-xs uppercase tracking-[0.12em] text-accent font-semibold">Intelligence Outputs</p>
						{[
							["Contradictions", "3 detected today", true],
							["Timeline Playback", "12 reconstructed incidents", false],
							["Evidence Packets", "4 export-ready reports", false],
							["Reality Score", "82% overall integrity", false],
						].map(([title, value, warning]) => (
							<div
								key={String(title)}
								className={`rounded-lg border p-4 ${warning ? "border-[#E74C3C]/40 bg-[#E74C3C]/5" : "border-border bg-muted/20"}`}
							>
								<p className="text-sm font-semibold">{title}</p>
								<p className={`text-xs mt-1 ${warning ? "text-[#E74C3C]" : "text-muted-foreground"}`}>{value}</p>
							</div>
						))}
					</div>
				</section>

				<section className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-card">
					<p className="text-xs uppercase tracking-[0.12em] text-accent font-semibold mb-3">Intelligence Flow</p>
					<div className="flex flex-wrap items-center gap-2 text-xs">
						{["Capture", "Analyze", "Detect", "Reconstruct", "Export"].map((step, index, arr) => (
							<div key={step} className="inline-flex items-center gap-2">
								<span className="rounded-full border border-border bg-muted/20 px-3 py-1.5 font-semibold tracking-[0.08em]">{step}</span>
								{index < arr.length - 1 && <span className="text-muted-foreground">→</span>}
							</div>
						))}
					</div>
				</section>

				<section className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-card">
					<p className="text-xs uppercase tracking-[0.12em] text-accent font-semibold mb-3">Live Intelligence Feed</p>
					<div className="space-y-2.5 text-sm leading-relaxed">
						<div className="rounded-lg border border-[#E74C3C]/40 bg-[#E74C3C]/5 px-4 py-3 text-[#E74C3C] font-semibold">⚠ Contradiction detected in contractor dispute</div>
						<div className="rounded-lg border border-border bg-muted/20 px-4 py-3">Screenshot evidence uploaded</div>
						<div className="rounded-lg border border-border bg-muted/20 px-4 py-3">Timeline reconstruction completed</div>
						<div className="rounded-lg border border-border bg-muted/20 px-4 py-3">Reality score increased to 82%</div>
					</div>
				</section>
			</main>
		</AppLayout>
	);
}