import type { Tables } from "@/integrations/supabase/types";
import type { Category } from "@/lib/categories";

export type RecordingStage = "capture" | "context" | "review" | "save";
export type CaptureMode = "speak" | "type" | "photo" | "location";
export type DraftStatus = "clean" | "unsaved" | "saved-locally" | "saving" | "saved";

export type RecordingCaseRow = Pick<Tables<"cases">, "id" | "title" | "category" | "updated_at">;

export type TranscriptEventType = "transcript" | "note" | "photo" | "location";

export type TranscriptEvent = {
  id: string;
  type: TranscriptEventType;
  text: string;
  occurredAt: string;
  interim?: boolean;
};

export type PendingEvidenceItem = {
  id: string;
  file: File;
  filename: string;
  type: string;
  capturedAt: string;
  source: "camera" | "files" | "voice";
  status: "pending" | "uploading" | "uploaded" | "failed";
  errorMessage?: string;
};

export type RecordingDraft = {
  version: 1;
  stage: RecordingStage;
  captureMode: CaptureMode;
  caseId: string;
  title: string;
  category: Category;
  occurredAt: string;
  location: string;
  people: string[];
  narrative: string;
  transcriptEvents: TranscriptEvent[];
  locationCapturedAt?: string;
  updatedAt: string;
};

export type RecordingFormState = Omit<RecordingDraft, "version" | "updatedAt"> & {
  evidenceItems: PendingEvidenceItem[];
};

export type DocumentationStrength = {
  score: number;
  label: "Needs context" | "Developing" | "Ready to review";
  missing: string[];
};

export type ValidationResult = {
  valid: boolean;
  missing: string[];
};

export type SaveProgress = {
  state: "idle" | "creating" | "uploading" | "associating" | "partial" | "complete" | "failed";
  message: string;
};

export type EvidenceUploadResult = {
  successful: Array<{
    filename: string;
    storagePath: string;
    type: string;
  }>;
  failed: Array<{
    filename: string;
    message: string;
  }>;
};
