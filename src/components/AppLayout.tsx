import { Link, NavLink } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { Shield, LayoutDashboard, CreditCard, Settings, LogOut, Siren, Settings2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const mobileNavChipClass = (isActive: boolean) =>
  cn(
    "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
    isActive ? "bg-accent/10 text-accent" : "text-muted-foreground hover:text-foreground hover:bg-white/5",
  );

const SidebarLink = ({
  to,
  icon: Icon,
  children,
  end,
}: {
  to: string;
  icon: React.ElementType;
  children: React.ReactNode;
  end?: boolean;
}) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      cn(
        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
        isActive
          ? "bg-accent/10 text-accent"
          : "text-muted-foreground hover:text-foreground hover:bg-white/5"
      )
    }
  >
    <Icon className="h-4 w-4 shrink-0" />
    {children}
  </NavLink>
);

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, signOut } = useAuth();
  const nav = useNavigate();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Fixed sidebar */}
      <aside
        className="fixed inset-y-0 left-0 w-60 border-r border-border flex-col z-40 hidden lg:flex"
        style={{ background: "hsl(220 41% 11%)" }}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2.5 px-5 border-b border-border shrink-0">
          <div
            className="h-7 w-7 rounded flex items-center justify-center shrink-0"
            style={{ background: "hsl(219 100% 65% / 0.12)" }}
          >
            <Shield className="h-3.5 w-3.5 text-accent" />
          </div>
          <span className="font-bold text-base text-foreground tracking-tight">Proof</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          <SidebarLink to="/dashboard" icon={LayoutDashboard} end>
            Dashboard
          </SidebarLink>
          <SidebarLink to="/stress-mode" icon={Siren}>
            Stress Mode
          </SidebarLink>
          <SidebarLink to="/pricing" icon={CreditCard}>
            Billing
          </SidebarLink>
          <SidebarLink to="/account" icon={Settings}>
            Settings
          </SidebarLink>
        </nav>

        {/* Bottom */}
        <div className="px-2 py-3 border-t border-border shrink-0">
          {user?.email && (
            <div className="px-3 py-1.5 mb-1">
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          )}
          <button
            type="button"
            onClick={async () => {
              await signOut();
              nav("/");
            }}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-60 flex-1 min-w-0">
        {/* Mobile top nav */}
        <div className="lg:hidden sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
          <div className="px-4 h-14 flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div
                className="h-7 w-7 rounded flex items-center justify-center shrink-0"
                style={{ background: "hsl(219 100% 65% / 0.12)" }}
              >
                <Shield className="h-3.5 w-3.5 text-accent" />
              </div>
              <span className="font-semibold text-sm tracking-tight">Proof</span>
            </Link>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                nav("/");
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              aria-label="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
          <div className="px-3 pb-2 overflow-x-auto">
            <div className="inline-flex gap-1 min-w-max">
              <NavLink
                to="/dashboard"
                end
                className={({ isActive }) => mobileNavChipClass(isActive)}
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/stress-mode"
                className={({ isActive }) => mobileNavChipClass(isActive)}
              >
                Stress Mode
              </NavLink>
              <NavLink
                to="/pricing"
                className={({ isActive }) => mobileNavChipClass(isActive)}
              >
                Billing
              </NavLink>
              <NavLink
                to="/account"
                className={({ isActive }) => mobileNavChipClass(isActive)}
              >
                <span className="inline-flex items-center gap-1.5">
                  Settings
                  <span aria-label="Dictation tone setting" title="Dictation tone setting" className="inline-flex">
                    <Settings2 className="h-2.5 w-2.5 text-muted-foreground/50" />
                  </span>
                </span>
              </NavLink>
            </div>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
};
