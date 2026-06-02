import { supabase } from "@/integrations/supabase/client";

export const EVIDENCE_BUCKET = "evidence";

function sanitizeFileName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || "evidence-file";
}

export function buildEvidenceStoragePath(params: {
  userId: string;
  caseId: string;
  incidentId: string;
  fileName: string;
}) {
  const safeName = sanitizeFileName(params.fileName);
  const uniquePrefix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${params.userId}/${params.caseId}/${params.incidentId}/${uniquePrefix}-${safeName}`;
}

export async function uploadEvidenceFile(file: File, path: string) {
  const { error } = await supabase.storage.from(EVIDENCE_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  });

  if (error) {
    throw error;
  }

  return path;
}

export async function createEvidenceSignedUrl(storagePath: string, expiresInSeconds = 60 * 60) {
  const { data, error } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) {
    throw error;
  }

  return data.signedUrl;
}

export async function removeEvidenceFile(storagePath: string) {
  const { error } = await supabase.storage.from(EVIDENCE_BUCKET).remove([storagePath]);
  if (error) throw error;
}
