import { LoaderCircle } from "lucide-react";

type ContextualLoadingProps = {
  title: string;
  detail?: string;
  className?: string;
};

export const ContextualLoading = ({ title, detail, className = "" }: ContextualLoadingProps) => (
  <div
    className={`flex min-h-48 items-center justify-center px-6 py-10 ${className}`}
    role="status"
    aria-live="polite"
  >
    <div className="max-w-md text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300">
        <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
      </span>
      <p className="mt-4 text-base font-bold text-foreground">{title}</p>
      {detail && <p className="mt-1 text-sm leading-6 text-muted-foreground">{detail}</p>}
    </div>
  </div>
);