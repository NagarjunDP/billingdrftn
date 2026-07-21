"use client";

import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Command, Zap } from "lucide-react";
import { format } from "date-fns";

const routeLabels: Record<string, string> = {
  "/sale": "Sale",
  "/products": "Products",
  "/invoices": "Invoices",
  "/dashboard": "Dashboard",
  "/gst-filing": "GST Filing",
  "/settings": "Settings",
};

export function TopBar() {
  const pathname = usePathname();
  const label = Object.entries(routeLabels).find(([k]) =>
    pathname === k || pathname.startsWith(k + "/")
  )?.[1] ?? "DRFTN";

  return (
    <header className="hidden lg:flex items-center justify-between h-14 px-6 bg-[var(--bg-surface)] border-b border-[var(--border)] flex-shrink-0 sticky top-0 z-30">
      {/* Left: page title */}
      <div className="flex items-center gap-2">
        <Zap size={16} className="text-[var(--accent)]" />
        <h1 className="text-sm font-bold text-[var(--text)]">DRFTN Billing</h1>
        <span className="text-[var(--text-dim)] text-sm">/</span>
        <span className="text-sm text-[var(--text-muted)]">{label}</span>
      </div>

      {/* Right: date + Cmd+K hint + user */}
      <div className="flex items-center gap-4">
        <span className="text-xs text-[var(--text-dim)]">
          {format(new Date(), "EEE, d MMM yyyy")}
        </span>
        <button
          className="hidden xl:flex items-center gap-1.5 text-xs text-[var(--text-dim)] bg-[var(--bg-elevated)] border border-[var(--border)] px-2.5 py-1.5 rounded-md hover:border-[var(--accent)] hover:text-[var(--text-muted)] transition-colors"
          onClick={() => {
            const ev = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true });
            window.dispatchEvent(ev);
          }}
        >
          <Command size={11} />
          <span>K</span>
          <span className="text-[var(--text-dim)]">— Quick search</span>
        </button>
        <UserButton appearance={{ elements: { avatarBox: "w-7 h-7" } }} />
      </div>
    </header>
  );
}
