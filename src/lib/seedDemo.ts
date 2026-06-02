import { supabase } from "@/integrations/supabase/client";
import { analyzeNarrative } from "./mockAI";

export async function seedDemoIfEmpty(userId: string) {
  const { count } = await supabase.from("cases").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if ((count ?? 0) > 0) return;

  const { data: caseRow, error } = await supabase
    .from("cases")
    .insert({
      user_id: userId,
      title: "Sample case — Kitchen Remodel Dispute",
      category: "Contractor",
      description: "Demo contractor dispute showing timeline playback, contradiction detection, and export-ready evidence.",
    })
    .select()
    .single();
  if (error || !caseRow) return;

  const incidents = [
    {
      title: "Contract signed with completion promise",
      occurred_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
      location: "124 Oak Street",
      people_involved: ["Contractor Dan", "Homeowner"],
      raw_narrative:
        "At 9:10am we signed a remodel agreement. Dan said cabinets were already ordered and the project would be complete by April 18. I took screenshots of the quote, payment receipt, and completion date from our text thread.",
      tags: ["contract", "promise", "screenshot"],
    },
    {
      title: "Timeline slips and messages conflict",
      occurred_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
      location: "124 Oak Street",
      people_involved: ["Contractor Dan", "Homeowner"],
      raw_narrative:
        "No crew arrived. Dan texted at 6:15pm saying supplier delays prevented ordering the cabinets. Earlier he said cabinets were already ordered. I uploaded screenshot evidence and a voice note describing the missed appointment.",
      tags: ["delay", "phone", "contradiction", "voice-note"],
    },
    {
      title: "Payment dispute and revised statement",
      occurred_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
      location: "124 Oak Street",
      people_involved: ["Contractor Dan", "Homeowner"],
      raw_narrative:
        "Dan arrived at 11:20am and said demolition could not continue until another payment was sent. He also said he never promised April 18 completion, despite previous texts saying exactly that. I logged witness details and attached payment receipts.",
      tags: ["payment", "witness", "contradiction"],
    },
    {
      title: "Final contradiction and escalation",
      occurred_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
      location: "124 Oak Street",
      people_involved: ["Contractor Dan", "Homeowner", "Neighbor witness"],
      raw_narrative:
        "At 4:40pm Dan said delays were caused by permit issues, but there were no permit notices filed for this scope. This conflicts with prior claims about ordered cabinets and supplier delays. I captured screenshots, recorded a note, and prepared an export packet.",
      tags: ["escalation", "export", "contradiction", "screenshot"],
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
