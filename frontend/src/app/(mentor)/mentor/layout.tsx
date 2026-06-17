"use client";

import {
  LayoutDashboard,
  Boxes,
  ClipboardList,
  Wallet,
  User,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import type { NavItem } from "@/components/layout/sidebar";

const items: NavItem[] = [
  { href: "/mentor/dashboard", label: "Boshqaruv paneli", icon: LayoutDashboard },
  { href: "/mentor/groups", label: "Guruhlarim", icon: Boxes },
  { href: "/mentor/journal", label: "Jurnal", icon: ClipboardList },
  { href: "/mentor/finance", label: "Maoshim", icon: Wallet },
  { href: "/mentor/profile", label: "Profil", icon: User },
];

export default function MentorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell role="mentor" items={items}>
      {children}
    </AppShell>
  );
}
