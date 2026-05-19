import { Link, useNavigate } from "react-router-dom";
import { Shield, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export const AppHeader = () => {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-40">
      <div className="container flex h-16 items-center justify-between">
        <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-navy flex items-center justify-center">
            <Shield className="h-4 w-4 text-navy-foreground" />
          </div>
          <span className="font-semibold text-lg tracking-tight">Proof</span>
        </Link>
        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <Link to="/dashboard"><Button variant="ghost" size="sm">Dashboard</Button></Link>
              <Link to="/pricing"><Button variant="ghost" size="sm">Pricing</Button></Link>
              <Link to="/account"><Button variant="ghost" size="sm">Account</Button></Link>
              <Button variant="outline" size="sm" onClick={async () => { await signOut(); nav("/"); }}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Link to="/pricing"><Button variant="ghost" size="sm">Pricing</Button></Link>
              <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
              <Link to="/auth?mode=signup"><Button size="sm">Start documenting</Button></Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};
