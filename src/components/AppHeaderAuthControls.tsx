import { Link, useNavigate } from "react-router-dom";
import { LogOut, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const AppHeaderAuthControls = () => {
  const { user, signOut } = useAuth();
  const nav = useNavigate();

  if (!user) {
    return (
      <>
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
          <Link to="/pricing">Pricing</Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
          <Link to="/auth">Sign in</Link>
        </Button>
        <Button asChild size="sm" className="bg-accent hover:bg-accent/90 text-white font-semibold">
          <Link to="/auth?mode=signup">
            <Mic className="mr-1.5 h-3.5 w-3.5" />
            Start Recording
          </Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
        <Link to="/dashboard">Dashboard</Link>
      </Button>
      <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
        <Link to="/pricing">Pricing</Link>
      </Button>
      <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
        <Link to="/account">Account</Link>
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="border-border"
        onClick={async () => {
          await signOut();
          nav("/");
        }}
        aria-label="Sign out"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </>
  );
};

export default AppHeaderAuthControls;
