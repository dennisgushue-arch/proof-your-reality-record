import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { corsHeaders } from "../_shared/cors.ts";

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: jsonHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !anonKey || !serviceRoleKey) throw new Error("Account deletion is not configured.");

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: evidenceRows, error: evidenceError } = await admin.from("evidence_items").select("storage_path").eq("user_id", user.id).not("storage_path", "is", null);
    if (evidenceError) throw evidenceError;

    const storagePaths = (evidenceRows ?? []).flatMap((row) => typeof row.storage_path === "string" && row.storage_path ? [row.storage_path] : []);
    for (let index = 0; index < storagePaths.length; index += 100) {
      const { error: storageError } = await admin.storage.from("evidence").remove(storagePaths.slice(index, index + 100));
      if (storageError) throw storageError;
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ deleted: true }), { status: 200, headers: jsonHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Account deletion failed.";
    console.error("delete_account_failed", { message });
    return new Response(JSON.stringify({ error: "Account deletion could not be completed. Contact support before retrying." }), { status: 500, headers: jsonHeaders });
  }
});