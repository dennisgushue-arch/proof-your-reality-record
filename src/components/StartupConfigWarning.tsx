import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const requiredClientEnv = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
] as const;

const envValueByKey: Record<(typeof requiredClientEnv)[number], string | undefined> = {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
};

const missingVars = requiredClientEnv.filter((key) => !envValueByKey[key]?.trim());

const hasWarnings = missingVars.length > 0;

export const StartupConfigWarning = () => {
  if (!hasWarnings) return null;

  return (
    <div className="container pt-4">
      <Alert className="border-warning/50 bg-warning/10 text-foreground [&>svg]:text-warning" role="status" aria-live="polite">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Configuration warning</AlertTitle>
        <AlertDescription>
          Missing required startup variables: <span className="font-mono">{missingVars.join(", ")}</span>. The app will stay usable,
          but authentication and backend-dependent features may fail until these values are configured.
        </AlertDescription>
      </Alert>
    </div>
  );
};
