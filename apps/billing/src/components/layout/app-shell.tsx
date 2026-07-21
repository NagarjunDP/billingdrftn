"use client";

import { Sidebar } from "./sidebar";
import { BottomTabBar } from "./bottom-tab-bar";
import { CommandPalette } from "./command-palette";
import { TopBar } from "./top-bar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-bg">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-60">
        {/* Desktop top bar */}
        <TopBar />

        {/* Page content */}
        <main className="flex-1 overflow-x-hidden pb-20 lg:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <BottomTabBar />

      {/* Desktop Cmd+K command palette */}
      <CommandPalette />
    </div>
  );
}
