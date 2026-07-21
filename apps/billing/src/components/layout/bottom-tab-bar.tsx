"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShoppingCart,
  Package,
  FileText,
  BarChart3,
  Scan,
} from "lucide-react";
import { cn } from "@/lib/utils";

const bottomTabs = [
  { href: "/sale",        label: "Sale",     icon: ShoppingCart },
  { href: "/sale?scan=1", label: "Scan",     icon: Scan, exact: false },
  { href: "/products",    label: "Products", icon: Package },
  { href: "/invoices",    label: "Invoices", icon: FileText },
  { href: "/dashboard",   label: "More",     icon: BarChart3 },
];

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "lg:hidden fixed bottom-0 inset-x-0 z-40",
        "bg-[var(--bg-surface)] border-t border-[var(--border)]",
        "flex items-stretch",
        "safe-bottom"
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {bottomTabs.map(({ href, label, icon: Icon }) => {
        const basePath = href.split("?")[0];
        const active = pathname === basePath || (basePath !== "/sale" && pathname.startsWith(basePath + "/"));
        return (
          <Link key={href} href={href} className="flex-1">
            <span
              className={cn(
                "tab-item no-tap-highlight",
                active && "active"
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span className="tab-label">{label}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
