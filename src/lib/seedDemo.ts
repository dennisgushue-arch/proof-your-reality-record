import { supabase } from "@/integrations/supabase/client";
import { analyzeNarrative } from "./mockAI";

const DEMO_CASE_TITLE = "Sample case — Kitchen Remodel Dispute";
const ADVANCED_DEMO_TITLE = "Interactive demo — Night Market Incident (Multi-evidence)";

export async function seedDemoIfEmpty(userId: string) {
  // Prefer the advanced interactive demo if available.
  const { data: existingAdvanced } = await supabase.from("cases").select("id").eq("user_id", userId).eq("title", ADVANCED_DEMO_TITLE).maybeSingle();
  if (existingAdvanced?.id) return existingAdvanced.id;

  // Create an advanced demo case showcasing more app features: photos, video, voice notes, GPS/location, witness statements, and export-ready evidence.
  const { data: advancedCase, error: advancedError } = await supabase
    .from("cases")
    .insert({
      user_id: userId,
      title: ADVANCED_DEMO_TITLE,
      category: "Personal Safety",
      description:
        "Interactive demo case demonstrating timeline playback, multi-media evidence (photo, video, voice), GPS pins, witness statements, contradiction detection, and export-ready packet.",
    })
    .select()
    .single();

  if (!advancedError && advancedCase) {
    const incidents = [
      {
        title: "Verbal harassment escalates",
        occurred_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5 - 1000 * 60 * 45).toISOString(),
        location: "Night Market — 3rd Avenue & Pine",
        people_involved: ["Suspect", "Victim"],
        raw_narrative:
          "At 8:12pm the suspect began shouting threats and following me through the market. I snapped several photos of the suspect, recorded a short video on my phone, and saved the GPS location from my phone. A nearby vendor witnessed the confrontation and agreed to give a short recorded statement.",
        tags: ["photo", "video", "gps", "witness", "voice-note"],
      },
      {
        title: "Vendor witness statement recorded",
        occurred_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5 - 1000 * 60 * 30).toISOString(),
        location: "Night Market — 3rd Avenue & Pine",
        people_involved: ["Vendor witness", "Victim"],
        raw_narrative:
          "Vendor said they saw the suspect grab the victim's arm and push them aside. They recorded a short voice note corroborating the sequence and gave their name and phone number as a contact.",
        tags: ["witness", "voice-note"],
      },
      {
        title: "Suspect denies physical contact",
        occurred_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5 - 1000 * 60 * 10).toISOString(),
        location: "Outside Night Market",
        people_involved: ["Suspect", "Victim", "Vendor witness"],
        raw_narrative:
          "Later the suspect told a bystander they never touched the victim and that the video was staged. This contradicts the vendor's voice note and the video evidence I captured earlier.",
        tags: ["contradiction", "video", "witness"],
      },
      {
        title: "Police dispatch and record prep",
        occurred_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
        location: "Local Precinct",
        people_involved: ["Victim"],
        raw_narrative:
          "I prepared an export packet with photos, the video clip, the vendor voice note, and the GPS coordinates to bring to the police. The export included a timeline and highlighted the contradiction between suspect statements and witness evidence.",
        tags: ["export", "police", "screenshot"],
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
        case_id: advancedCase.id,
        user_id: userId,
        title: inc.title,
        occurred_at: inc.occurred_at,
        location: inc.location,
        people_involved: inc.people_involved,
        raw_narrative: inc.raw_narrative,
        neutral_summary: ai.neutral_summary,
        emotional_language_removed: ai.emotional_language_removed,
        evidence_quality_score: ai.evidence_quality_score,
        ai_analysis: ai,
        tags: inc.tags,
      });
    }

    return advancedCase.id;
  }

  // Fallback: if advanced demo couldn't be created, ensure the original simple demo exists.
  const { data: existingDemoCase } = await supabase
    .from("cases")
    .select("id")
    .eq("user_id", userId)
    .eq("title", DEMO_CASE_TITLE)
    .maybeSingle();

  if (existingDemoCase?.id) return existingDemoCase.id;

  const { data: caseRow, error } = await supabase
    .from("cases")
    .insert({
      user_id: userId,
      title: DEMO_CASE_TITLE,
      category: "Contractor",
      description: "Demo contractor dispute showing timeline playback, contradiction detection, and export-ready evidence.",
    })
    .select()
    .single();
  if (error || !caseRow) return null;

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
      ai_analysis: ai,
      tags: inc.tags,
    });
  }

  return caseRow.id;
}
