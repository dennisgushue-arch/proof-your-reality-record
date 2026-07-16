import { supabase } from "@/integrations/supabase/client";
import { analyzeNarrative } from "./mockAI";

export async function seedDemoIfEmpty(userId: string): Promise<string | null> {
  const { count } = await supabase.from("cases").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if ((count ?? 0) > 0) return null;

  const demoCases = [
    {
      title: "Sample case — Kitchen Remodel Dispute",
      category: "Contractor",
      description:
        "Demo contractor dispute showing timeline playback, contradiction detection, and export-ready evidence.",
      incidents: [
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
          title: "Final contradiction and escalation",
          occurred_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
          location: "124 Oak Street",
          people_involved: ["Contractor Dan", "Homeowner", "Neighbor witness"],
          raw_narrative:
            "At 4:40pm Dan said delays were caused by permit issues, but there were no permit notices filed for this scope. This conflicts with prior claims about ordered cabinets and supplier delays. I captured screenshots, recorded a note, and prepared an export packet.",
          tags: ["escalation", "export", "contradiction", "screenshot"],
        },
      ],
    },
    {
      title: "Sample case — Co-parenting Schedule Conflict",
      category: "Co-parenting",
      description: "Demo family timeline with pickup changes, message conflicts, and repeat-pattern detection.",
      incidents: [
        {
          title: "Pickup time agreed in writing",
          occurred_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
          location: "River Park School",
          people_involved: ["Parent A", "Parent B"],
          raw_narrative:
            "We agreed in text that pickup would be at 3:15pm after school. I saved screenshots of the exchange and logged the school office note.",
          tags: ["pickup", "text", "agreement"],
        },
        {
          title: "Last-minute reschedule",
          occurred_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
          location: "River Park School",
          people_involved: ["Parent A", "Parent B"],
          raw_narrative:
            "At 2:50pm a new message said pickup would be delayed until 5:00pm. That conflicted with the earlier agreement and happened after I had already left work early.",
          tags: ["delay", "pickup", "contradiction"],
        },
        {
          title: "Missed exchange documented",
          occurred_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
          location: "River Park School",
          people_involved: ["Parent A", "Parent B", "Witness teacher"],
          raw_narrative:
            "The child was not picked up until after 5:20pm. The office log shows repeated delays this week. I captured the attendance record and saved a witness note from the teacher.",
          tags: ["witness", "school", "schedule"],
        },
      ],
    },
    {
      title: "Sample case — Workplace Retaliation Review",
      category: "Workplace",
      description: "Demo workplace record showing policy conflicts, timeline checks, and evidence scoring.",
      incidents: [
        {
          title: "Performance feedback documented",
          occurred_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 18).toISOString(),
          location: "HQ Office",
          people_involved: ["Manager Lee", "Employee"],
          raw_narrative:
            "I was told my performance was satisfactory and that the promotion track would stay open. I saved the meeting notes and follow-up email.",
          tags: ["performance", "email", "meeting"],
        },
        {
          title: "Policy statement shifts",
          occurred_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
          location: "HQ Office",
          people_involved: ["Manager Lee", "Employee"],
          raw_narrative:
            "Three days later I was told the promotion path was frozen due to a policy change. That was different from the earlier message, so I captured the chat thread and calendar invite.",
          tags: ["policy", "chat", "contradiction"],
        },
        {
          title: "Escalation meeting and witness note",
          occurred_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(),
          location: "HQ Office",
          people_involved: ["Manager Lee", "Employee", "HR rep"],
          raw_narrative:
            "In the escalation meeting I was told there was no earlier promotion discussion. HR was present and took notes. I retained the meeting invite, a witness summary, and the related email thread.",
          tags: ["hr", "meeting", "witness"],
        },
      ],
    },
  ];

  const createdCases: Array<{ id: string }> = [];

  for (const demoCase of demoCases) {
    const { data: caseRow, error } = await supabase
      .from("cases")
      .insert({
        user_id: userId,
        title: demoCase.title,
        category: demoCase.category,
        description: demoCase.description,
      })
      .select("id")
      .single();

    if (error || !caseRow) return createdCases[0]?.id ?? null;

    createdCases.push(caseRow);

    for (const inc of demoCase.incidents) {
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

  return createdCases[0]?.id ?? null;
}
