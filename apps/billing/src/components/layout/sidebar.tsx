"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShoppingCart,
  Package,
  FileText,
  BarChart3,
  FileSpreadsheet,
  Settings,
  ChevronLeft,
  ChevronRight,
  Store,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { UserButton } from "@clerk/nextjs";

const navItems = [
  { href: "/sale",        label: "Sale",       icon: ShoppingCart, shortcut: "S" },
  { href: "/products",    label: "Products",   icon: Package,      shortcut: "P" },
  { href: "/invoices",    label: "Invoices",   icon: FileText,     shortcut: "I" },
  { href: "/dashboard",   label: "Dashboard",  icon: BarChart3,    shortcut: "D" },
  { href: "/gst-filing",  label: "GST Filing", icon: FileSpreadsheet, shortcut: "G" },
  { href: "/settings",    label: "Settings",   icon: Settings,     shortcut: null },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col fixed inset-y-0 left-0 z-40 transition-all duration-200",
        "bg-[var(--bg-surface)] border-r border-[var(--border)]",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Brand header */}
      <div className={cn(
        "flex items-center border-b border-[var(--border)] h-14 flex-shrink-0",
        collapsed ? "justify-center px-0" : "px-4 gap-2.5"
      )}>
        <div className="w-8 h-8 rounded-lg gradient-accent flex items-center justify-center flex-shrink-0">
          <Zap size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--accent)] truncate leading-tight">DRFTN</p>
            <p className="text-[10px] text-[var(--text-muted)] truncate leading-tight">Billing System</p>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-2 flex flex-col gap-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href}>
              <span
                title={collapsed ? label : undefined}
                className={cn(
                  "nav-item no-tap-highlight",
                  active && "active",
                  collapsed && "justify-center px-0 py-3"
                )}
              >
                <Icon size={18} className="flex-shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom: User + Collapse toggle */}
      <div className={cn(
        "border-t border-[var(--border)] p-3 flex items-center gap-2",
        collapsed && "justify-center"
      )}>
        <UserButton appearance={{ elements: { avatarBox: "w-7 h-7" } }} />
        {!collapsed && <span className="text-xs text-[var(--text-muted)] truncate flex-1">Account</span>}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          "absolute -right-3 top-16 w-6 h-6 rounded-full",
          "bg-[var(--bg-elevated)] border border-[var(--border)]",
          "flex items-center justify-center",
          "text-[var(--text-muted)] hover:text-[var(--text)]",
          "transition-colors duration-150 z-10"
        )}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}

export function SidebarSpacer({ collapsed }: { collapsed?: boolean }) {
  return <div className={cn("hidden lg:block flex-shrink-0 transition-all duration-200", collapsed ? "w-16" : "w-60")} />;
}
