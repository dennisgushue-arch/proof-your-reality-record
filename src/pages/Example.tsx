import { Link } from "react-router-dom";
import { Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/AppHeader";
import { Disclaimer } from "@/components/Disclaimer";

const incidents = [
  { date: "Mar 03, 2026 · 7:42 PM", title: "Reported broken heater", summary: "Texted landlord that heater stopped working. He replied within 10 minutes and said he would send someone the next morning.", location: "Apartment 4B", people: "Landlord Mike" },
  { date: "Mar 05, 2026 · 5:00 PM", title: "No one showed up", summary: "No technician arrived between 9 AM and 5 PM. Two unanswered calls. Landlord stated the plumber rescheduled.", location: "Apartment 4B", people: "Landlord Mike" },
  { date: "Mar 10, 2026 · 11:20 AM", title: "Partial repair attempt", summary: "Technician inspected for 15 minutes and said a part was needed. Landlord stated the part would arrive within 3 business days.", location: "Apartment 4B", people: "Repair tech, Landlord Mike" },
];

const Example = () => (
  <div className="min-h-screen bg-subtle">
    <AppHeader />
    <main className="container py-10 max-w-3xl">
      <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4 mr-1" /> Back to home</Link>
      <article className="mt-6 rounded-xl bg-card shadow-elevated border border-border overflow-hidden">
        <div className="bg-hero text-navy-foreground p-10">
          <div className="flex items-center gap-2 text-sm text-white/70"><Shield className="h-4 w-4" /> Sample Evidence Packet</div>
          <h1 className="mt-6 text-3xl md:text-4xl font-semibold text-white">Apartment 4B repairs</h1>
          <p className="mt-2 text-white/70">Landlord/Tenant</p>
        </div>
        <div className="p-10 space-y-8">
          <section>
            <h2 className="text-xl font-semibold">Case summary</h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">Heater stopped working on March 3. Three documented incidents over one week showing repeated delays and unfulfilled commitments from landlord.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold">Timeline</h2>
            <ol className="mt-4 space-y-6 border-l-2 border-border pl-6">
              {incidents.map((i) => (
                <li key={i.title} className="relative">
                  <span className="absolute -left-[31px] top-2 h-3 w-3 rounded-full bg-accent ring-4 ring-background" />
                  <div className="text-xs font-mono text-muted-foreground">{i.date}</div>
                  <h3 className="mt-1 font-semibold">{i.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{i.summary}</p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    <div><span className="font-medium">Location:</span> {i.location}</div>
                    <div><span className="font-medium">People:</span> {i.people}</div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
          <section className="border-t pt-6"><Disclaimer /></section>
        </div>
      </article>
      <div className="mt-8 text-center">
        <Link to="/auth?mode=signup"><Button size="lg">Start your own evidence timeline</Button></Link>
      </div>
    </main>
  </div>
);

export default Example;
