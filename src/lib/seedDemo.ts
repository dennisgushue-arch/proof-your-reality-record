import { supabase } from "@/integrations/supabase/client";
import { analyzeNarrative } from "./mockAI";

export async function seedDemoIfEmpty(userId: string) {
  const { count } = await supabase.from("cases").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if ((count ?? 0) > 0) return;

  const { data: caseRow, error } = await supabase
    .from("cases")
    .insert({
      user_id: userId,
      title: "Sample case — Apartment 4B repairs",
      category: "Landlord/Tenant",
      description: "Demo case showing how Proof organizes incidents into a timeline.",
    })
    .select()
    .single();
  if (error || !caseRow) return;

  const incidents = [
    {
      title: "Reported broken heater",
      occurred_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
      location: "Apartment 4B",
      people_involved: ["Landlord Mike"],
      raw_narrative:
        "I texted Mike at 7:42pm letting him know the heater stopped working. He replied within 10 minutes and said he would send someone tomorrow morning. I told him the apartment was 58F. He promised it would be fixed by Friday.",
      tags: ["text", "promise"],
    },
    {
      title: "No one showed up",
      occurred_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
      location: "Apartment 4B",
      people_involved: ["Landlord Mike"],
      raw_narrative:
        "Nobody showed up between 9am and 5pm. I called Mike twice, no answer. He sent a text at 6:15pm saying his plumber rescheduled. Earlier he said he would be here Tuesday, but now he's saying Thursday.",
      tags: ["missed", "phone"],
    },
    {
      title: "Partial repair attempt",
      occurred_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
      location: "Apartment 4B",
      people_involved: ["Repair tech", "Landlord Mike"],
      raw_narrative:
        "Tech arrived at 11:20am, looked at the heater for 15 minutes, said the part needed to be ordered. Mike said the part would arrive within 3 business days. The apartment is still cold.",
      tags: ["visit"],
    },
  ];

  for (const inc of incidents) {
    const ai = analyzeNarrative({
      title: inc.title,
      narrative: inc.raw_narrative,
      occurred_at: inc.occurred_at,
      location: inc.location,
      people: inc.people_involved,
    });
    await supabase.from("incidents").insert({
      case_id: caseRow.id,
      user_id: userId,
      title: inc.title,
      occurred_at: inc.occurred_at,
      location: inc.location,
      people_involved: inc.people_involved,
      raw_narrative: inc.raw_narrative,
      neutral_summary: ai.neutral_summary,
      emotional_language_removed: ai.emotional_language_removed,
      evidence_quality_score: ai.evidence_quality_score,
      ai_analysis: ai as any,
      tags: inc.tags,
    });
  }
}
