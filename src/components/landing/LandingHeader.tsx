import { Link } from "react-router-dom";
import { Menu, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navItems = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Use Cases", href: "#use-cases" },
  { label: "Security", href: "#security" },
  { label: "Pricing", href: "#pricing" },
];

const LandingHeader = () => (
  <header className="sticky top-0 z-50 border-b border-blue-300/20 bg-[#050D19]/90 shadow-[0_10px_40px_-24px_rgba(37,99,235,0.65)] backdrop-blur-xl">
    <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:h-[88px] lg:px-5 xl:px-6">
      <Link
        to="/"
        className="group flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 lg:gap-3.5"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-blue-300/35 bg-gradient-to-br from-blue-400/25 to-blue-700/10 shadow-[0_0_28px_rgba(59,130,246,0.22)] transition-all group-hover:border-blue-300/55 group-hover:bg-blue-400/25 lg:h-12 lg:w-12">
          <ShieldCheck className="h-6 w-6 text-blue-200 lg:h-7 lg:w-7" aria-hidden="true" />
        </span>
        <span className="truncate text-2xl font-black tracking-[-0.055em] text-white sm:text-3xl lg:text-4xl">Proof</span>
      </Link>

      <nav className="hidden items-center gap-0.5 lg:flex xl:gap-1" aria-label="Primary navigation">
        {navItems.map((item) => (
          <a key={item.href} href={item.href} className="rounded-lg px-2.5 py-2.5 text-[15px] font-semibold text-slate-300 transition-colors hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 xl:px-3.5">
            {item.label}
          </a>
        ))}
      </nav>

      <div className="hidden items-center gap-2.5 lg:flex">
        <Button asChild variant="ghost" className="h-11 px-4 font-semibold text-[#F8FAFC] hover:bg-white/[0.07] hover:text-[#F8FAFC]">
          <Link to="/auth">Sign In</Link>
        </Button>
        <Button asChild className="h-12 rounded-xl border border-blue-300/30 bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] px-6 text-base font-bold text-white shadow-[0_12px_32px_-10px_rgba(37,99,235,0.8)] transition-all hover:-translate-y-0.5 hover:from-[#3B82F6] hover:to-[#38BDF8] hover:shadow-[0_16px_38px_-10px_rgba(37,99,235,0.9)]">
          <Link to="/auth?mode=signup">Start Documenting</Link>
        </Button>
      </div>

      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 focus-visible:ring-blue-400 lg:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Button>
        </SheetTrigger>
        <SheetContent className="border-white/10 bg-[#091322] text-white">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2 text-white">
              <ShieldCheck className="h-5 w-5 text-blue-300" aria-hidden="true" /> Proof
            </SheetTitle>
            <SheetDescription className="text-slate-400">Private incident and evidence organization.</SheetDescription>
          </SheetHeader>
          <nav className="mt-8 flex flex-col gap-1" aria-label="Mobile navigation">
            {navItems.map((item) => (
              <SheetClose asChild key={item.href}>
                <a href={item.href} className="rounded-xl px-4 py-3 text-base font-medium text-slate-200 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                  {item.label}
                </a>
              </SheetClose>
            ))}
          </nav>
          <div className="mt-8 grid gap-3 border-t border-white/10 pt-6">
            <SheetClose asChild>
              <Button asChild variant="outline" className="border-white/15 bg-transparent text-white hover:bg-white/5">
                <Link to="/auth">Sign In</Link>
              </Button>
            </SheetClose>
            <SheetClose asChild>
              <Button asChild className="h-12 bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] font-bold text-white hover:from-[#3B82F6] hover:to-[#38BDF8]">
                <Link to="/auth?mode=signup">Start Documenting</Link>
              </Button>
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  </header>
);

export default LandingHeader;
