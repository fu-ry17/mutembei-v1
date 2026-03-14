"use client";

import Link from "next/link";
import {
  Home,
  SearchX,
  Zap,
  AlertCircle,
  RotateCcw,
  ArrowLeft,
} from "lucide-react";

const BackButton = () => (
  <button
    onClick={() => history.back()}
    className="inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-medium transition hover:bg-gray-50 active:scale-95"
  >
    <ArrowLeft size={15} />
    Go back
  </button>
);

const NotFound = () => {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 py-24 text-foreground">
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(83,74,183,0.08)_0%,transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0">
        <AlertCircle
          className="absolute left-[8%] top-[20%] animate-bounce text-primary opacity-20"
          size={28}
        />
        <Zap
          className="absolute right-[10%] top-[30%] animate-pulse text-primary opacity-20"
          size={22}
        />
        <RotateCcw
          className="absolute bottom-[25%] left-[15%] animate-spin text-primary opacity-20"
          style={{ animationDuration: "6s" }}
          size={20}
        />
        <SearchX
          className="absolute bottom-[20%] right-[18%] animate-bounce text-primary opacity-20"
          size={24}
        />
      </div>
      <div className="relative z-10 flex flex-col items-center gap-6 text-center">
        <div className="flex h-[88px] w-[88px] animate-pulse items-center justify-center rounded-full border bg-muted">
          <SearchX size={40} className="text-primary" />
        </div>
        <h1
          className="font-black leading-none"
          style={{ fontSize: "96px", letterSpacing: "-4px" }}
        >
          <span className="text-primary">4</span>
          <span>0</span>
          <span className="text-primary">4</span>
        </h1>
        <p className="text-xl font-bold tracking-tight">Page not found</p>
        <p className="max-w-sm text-[15px] leading-relaxed text-muted-foreground">
          Looks like this page wandered off. It might have moved, been deleted,
          or never existed in the first place.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 active:scale-95"
          >
            <Home size={15} />
            Go home
          </Link>
          <BackButton />
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Home size={12} />
          <span>home</span>
          <span>/</span>
          <span>unknown page</span>
        </div>
      </div>
    </main>
  );
};

export default NotFound;
