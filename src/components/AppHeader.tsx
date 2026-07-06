import { Link } from "react-router-dom";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppHeaderAuthControls from "@/components/AppHeaderAuthControls";

export const AppHeader = () => {
  const legalLinks = (
    <div className="hidden lg:flex items-center gap-3 mr-2">
      <a href="/legal/privacy-policy.html" className="legal-link text-xs text-muted-foreground">Privacy</a>
      <a href="/legal/terms-of-service.html" className="legal-link text-xs text-muted-foreground">Terms</a>
      <a href="/legal/data-deletion.html" className="legal-link text-xs text-muted-foreground">Data Deletion</a>
    </div>
  );

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-40">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div
            className="h-7 w-7 rounded flex items-center justify-center shrink-0"
            style={{ background: "hsl(219 100% 65% / 0.12)" }}
          >
            <Shield className="h-3.5 w-3.5 text-accent" />
          </div>
          <span className="font-bold text-base tracking-tight">Proof</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
          <a href="/legal/privacy-policy.html" className="legal-link lg:hidden text-xs text-muted-foreground px-2 py-1 whitespace-nowrap">Privacy</a>
          {legalLinks}
          <AppHeaderAuthControls />
        </nav>
      </div>
    </header>
  );
};

