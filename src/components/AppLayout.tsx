import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Shield,
  Home as HomeIcon,
  FolderKanban,
  Mic,
  Sparkles,
  UserCircle2,
  LogOut,
  Lock,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: React.ElementType;
  end?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Home", icon: HomeIcon, end: true },
  { to: "/cases", label: "Cases", icon: FolderKanban },
  { to: "/record", label: "Record", icon: Mic },
  { to: "/ai", label: "Proof AI", icon: Sparkles },
  { to: "/account", label: "Account", icon: UserCircle2 },
];

const SidebarLink = ({ item }: { item: NavItem }) => (
  <NavLink
    to={item.to}
    end={item.end}
    className={({ isActive }) =>
      cn(
        "group relative flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-medium transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-white/5",
      )
    }
  >
    {({ isActive }) => (
      <>
        {isActive && (
          <span
            aria-hidden
            className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-primary"
          />
        )}
        <item.icon className="h-4 w-4 shrink-0" />
        <span>{item.label}</span>
      </>
    )}
  </NavLink>
);

const BottomNavLink = ({ item }: { item: NavItem }) => (
  <NavLink
    to={item.to}
    end={item.end}
    className={({ isActive }) =>
      cn(
        "flex flex-col items-center justify-center gap-0.5 py-2 flex-1 text-[10px] font-medium tracking-wide transition-colors",
        isActive ? "text-primary" : "text-muted-foreground",
      )
    }
  >
    <item.icon className="h-5 w-5" />
    <span>{item.label}</span>
  </NavLink>
);

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, signOut } = useAuth();
  const nav = useNavigate();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside
        className="fixed inset-y-0 left-0 w-60 border-r border-white/5 flex-col z-40 hidden lg:flex"
        style={{ background: "hsl(220 45% 6%)" }}
      >
        <div className="px-5 pt-6 pb-5 border-b border-white/5 shrink-0">
          <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2.5">
            <div
              className="h-8 w-8 rounded-md flex items-center justify-center shrink-0 ring-1 ring-primary/30"
              style={{ background: "hsl(219 100% 65% / 0.14)" }}
            >
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div className="leading-tight">
              <div className="font-bold text-[15px] text-foreground tracking-tight">Proof</div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Reality Intelligence
              </div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-white/5 shrink-0 space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider px-1">
            <Lock className="h-3 w-3 text-success" />
            Encrypted · Private
          </div>
          {user?.email && (
            <div className="px-1">
              <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
            </div>
          )}
          {user && (
            <button
              type="button"
              onClick={async () => {
                await signOut();
                nav("/");
              }}
              className="flex w-full items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              Sign out
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-60 flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-30 border-b border-white/5 bg-background/95 backdrop-blur">
          <div className="px-4 h-14 flex items-center justify-between">
            <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2">
              <div
                className="h-7 w-7 rounded-md flex items-center justify-center shrink-0 ring-1 ring-primary/30"
                style={{ background: "hsl(219 100% 65% / 0.14)" }}
              >
                <Shield className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="font-semibold text-sm tracking-tight">Proof</span>
            </Link>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider">
              <Lock className="h-3 w-3 text-success" />
              Encrypted
            </div>
          </div>
        </div>

        <div className="flex-1 pb-20 lg:pb-0">{children}</div>

        {/* Mobile bottom nav */}
        {user && (
          <nav
            className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-white/5 flex"
            style={{
              background: "hsl(220 45% 6% / 0.98)",
              backdropFilter: "blur(12px)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            {NAV_ITEMS.map((item) => (
              <BottomNavLink key={item.to} item={item} />
            ))}
          </nav>
        )}
      </div>
    </div>
  );
};
