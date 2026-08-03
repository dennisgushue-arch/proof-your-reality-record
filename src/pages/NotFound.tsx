import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, FolderKanban, Home, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050812] px-4 text-white">
      <div className="w-full max-w-2xl rounded-[32px] border border-white/[0.08] bg-[#0B111A] p-8 text-center shadow-2xl sm:p-12">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-500/10 text-blue-300"><SearchX className="h-7 w-7" aria-hidden="true" /></span>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-blue-300">404 · Page not found</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">This page is outside the record</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-400">The address <span className="break-all font-mono text-slate-300">{location.pathname}</span> does not match an available Proof page. Your saved records are unaffected.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button asChild className="rounded-xl bg-blue-500 font-bold hover:bg-blue-400"><Link to="/dashboard"><Home className="mr-2 h-4 w-4" />Dashboard</Link></Button>
          <Button asChild variant="outline" className="rounded-xl border-white/10 bg-white/[0.03]"><Link to="/cases"><FolderKanban className="mr-2 h-4 w-4" />Cases</Link></Button>
          <Button type="button" variant="ghost" onClick={() => globalThis.history.back()} className="rounded-xl text-slate-300"><ArrowLeft className="mr-2 h-4 w-4" />Go back</Button>
        </div>
      </div>
    </main>
  );
};

export default NotFound;
