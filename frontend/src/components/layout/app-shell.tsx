"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Sidebar, type NavItem } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { useMe } from "@/hooks/use-auth";
import { homeForRole } from "@/lib/auth";
import type { Role } from "@/types";

interface AppShellProps {
  role: Role;
  items: NavItem[];
  children: React.ReactNode;
}

/** Authenticated layout shell with role + password guards and a collapsible sidebar. */
export function AppShell({ role, items, children }: AppShellProps) {
  const router = useRouter();
  const { data: user, isLoading, isError } = useMe();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  // Mobil ekranda sidebar dastlab yopiq, desktopda ochiq bo'lsin.
  React.useEffect(() => {
    setSidebarOpen(window.innerWidth >= 768);
  }, []);

  React.useEffect(() => {
    if (isLoading) return;
    if (isError || !user) {
      router.replace("/login");
      return;
    }
    if (user.mustChangePassword) {
      router.replace("/change-password");
      return;
    }
    if (user.role !== role) {
      router.replace(homeForRole(user.role));
    }
  }, [isLoading, isError, user, role, router]);

  if (isLoading || !user || user.role !== role || user.mustChangePassword) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        items={items}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar
          user={user}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
