"use client";

import {
  LayoutDashboard,
  Boxes,
  GraduationCap,
  Trophy,
  User,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import type { NavItem } from "@/components/layout/sidebar";

const items: NavItem[] = [
  { href: "/student/dashboard", label: "Boshqaruv paneli", icon: LayoutDashboard },
  { href: "/student/groups", label: "Guruhlarim", icon: Boxes },
  { href: "/student/academic", label: "O'zlashtirish", icon: GraduationCap },
  { href: "/student/rating", label: "Reyting", icon: Trophy },
  { href: "/student/profile", label: "Profil", icon: User, footer: true },
];

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell role="student" items={items}>
      {children}
    </AppShell>
  );
}
