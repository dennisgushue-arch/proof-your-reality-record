import { supabase } from "@/integrations/supabase/client";

export type ProductEventName =
  | "signup_completed"
  | "first_case_created"
  | "first_incident_created"
  | "third_incident_created"
  | "premium_prompt_seen"
  | "pricing_viewed"
  | "checkout_started"
  | "subscription_started";

export async function trackProductEvent(
  eventName: ProductEventName,
  eventData: Record<string, unknown> = {},
) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase.from("product_events").insert({
      user_id: user.id,
      event_name: eventName,
      event_data: eventData,
    });

    if (error) {
      console.warn("Analytics event failed:", eventName, error.message);
    }
  } catch (error) {
    console.warn("Analytics event failed:", eventName, error);
  }
}
