import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  BrainCircuit,
  FolderKanban,
  Home as HomeIcon,
  Lock,
  LogOut,
  Plus,
  Shield,
  UserCircle2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { OfflineNotice } from "@/features/release-v1/components/OfflineNotice";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: React.ElementType;
  end?: boolean;
};

const PRIMARY_NAV: NavItem[] = [
  { to: "/dashboard", label: "Home", icon: HomeIcon, end: true },
  { to: "/cases", label: "Cases", icon: FolderKanban },
  { to: "/ai", label: "Proof AI", icon: BrainCircuit },
  { to: "/account", label: "Account", icon: UserCircle2 },
];

const SidebarLink = ({ item }: { item: NavItem }) => (
  <NavLink
    to={item.to}
    end={item.end}
    className={({ isActive }) =>
      cn(
        "group relative flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all duration-200",
        isActive
          ? "bg-blue-500/12 text-blue-300 shadow-[inset_0_0_0_1px_rgba(96,165,250,0.14)]"
          : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100",
      )
    }
  >
    {({ isActive }) => (
      <>
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
            isActive ? "bg-blue-500/15 text-blue-300" : "bg-white/[0.03] text-slate-500 group-hover:text-slate-200",
          )}
        >
          <item.icon className="h-4 w-4" />
        </span>
        <span>{item.label}</span>
        {isActive && (
          <span
            aria-hidden
            className="absolute right-3 h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_14px_rgba(96,165,250,0.9)]"
          />
        )}
      </>
    )}
  </NavLink>
);

const MobileNavItem = ({ item }: { item: NavItem }) => (
  <NavLink
    to={item.to}
    end={item.end}
    className={({ isActive }) =>
      cn(
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-semibold tracking-wide transition-colors",
        isActive ? "text-blue-300" : "text-slate-500",
      )
    }
  >
    {({ isActive }) => (
      <>
        <span className={cn("rounded-xl p-1.5 transition-colors", isActive && "bg-blue-500/10")}>
          <item.icon className="h-5 w-5" />
        </span>
        <span>{item.label}</span>
      </>
    )}
  </NavLink>
);

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-xl focus:bg-blue-500 focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white">
        Skip to content
      </a>
      <OfflineNotice />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(circle at 75% -10%, rgba(37,99,235,0.18), transparent 34%), radial-gradient(circle at 15% 20%, rgba(14,165,233,0.07), transparent 28%)",
        }}
      />

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-white/[0.06] bg-[#080d15]/95 backdrop-blur-xl lg:flex">
        <div className="border-b border-white/[0.06] px-6 py-6">
          <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/12 ring-1 ring-blue-400/25">
              <Shield className="h-5 w-5 text-blue-300" />
              <span className="absolute inset-0 rounded-2xl shadow-[0_0_28px_rgba(59,130,246,0.18)]" />
            </div>
            <div>
              <div className="text-lg font-black tracking-[-0.03em]">Proof</div>
              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Reality Intelligence
              </div>
            </div>
          </Link>
        </div>

        <div className="px-4 pt-5">
          <Link
            to="/record"
            className="group flex items-center justify-between rounded-2xl bg-blue-500 px-4 py-3.5 font-semibold text-white shadow-[0_16px_40px_-18px_rgba(59,130,246,0.95)] transition hover:bg-blue-400"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15">
                <Plus className="h-4 w-4" />
              </span>
              Record incident
            </span>
            <span className="text-blue-100 transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
          <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
            Workspace
          </div>
          {PRIMARY_NAV.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}
        </nav>

        <div className="border-t border-white/[0.06] p-4">
          <div className="mb-3 rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.04] p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
              <Lock className="h-3.5 w-3.5" />
              Private workspace
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
              Your records stay scoped to your account.
            </p>
          </div>

          {user?.email && (
            <p className="mb-2 truncate px-2 text-[11px] text-slate-600">{user.email}</p>
          )}

          {user && (
            <button
              type="button"
              onClick={async () => {
                await signOut();
                navigate("/");
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-500 transition hover:bg-white/[0.04] hover:text-slate-200"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          )}
        </div>
      </aside>

      <div className="relative min-h-screen lg:ml-72">
        <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#070b12]/85 backdrop-blur-xl lg:hidden">
          <div className="flex h-16 items-center justify-between px-4">
            <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/12 ring-1 ring-blue-400/20">
                <Shield className="h-4 w-4 text-blue-300" />
              </span>
              <span className="text-base font-black tracking-[-0.03em]">Proof</span>
            </Link>
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-400/10 bg-emerald-400/[0.04] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-300">
              <Lock className="h-3 w-3" />
              Private
            </div>
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="pb-28 focus:outline-none lg:pb-0">{children}</main>

        {user && (
          <nav
            className="fixed inset-x-0 bottom-0 z-40 flex items-end border-t border-white/[0.07] bg-[#080d15]/96 px-2 pt-1 backdrop-blur-xl lg:hidden"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 6px)" }}
          >
            <MobileNavItem item={PRIMARY_NAV[0]} />
            <MobileNavItem item={PRIMARY_NAV[1]} />

            <Link to="/record" className="-mt-6 flex min-w-[72px] flex-col items-center gap-1">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500 text-white shadow-[0_12px_32px_-10px_rgba(59,130,246,1)] ring-4 ring-[#080d15]">
                <Plus className="h-6 w-6" />
              </span>
              <span className="text-[10px] font-bold text-blue-300">Record</span>
            </Link>

            <MobileNavItem item={PRIMARY_NAV[2]} />
            <MobileNavItem item={PRIMARY_NAV[3]} />
          </nav>
        )}
      </div>
    </div>
  );
};
