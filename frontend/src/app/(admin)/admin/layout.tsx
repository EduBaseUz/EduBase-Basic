"use client";

import {
  LayoutDashboard,
  Users,
  BookOpen,
  Boxes,
  Wallet,
  Settings,
  User,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import type { NavItem } from "@/components/layout/sidebar";

const items: NavItem[] = [
  { href: "/admin/dashboard", label: "Boshqaruv paneli", icon: LayoutDashboard },
  {
    label: "Foydalanuvchilar",
    icon: Users,
    children: [
      { href: "/admin/users/mentors", label: "Mentorlar" },
      { href: "/admin/users/students", label: "Talabalar" },
      { href: "/admin/users/parents", label: "Ota-onalar" },
    ],
  },
  { href: "/admin/courses", label: "Mutaxassisliklar", icon: BookOpen },
  { href: "/admin/groups", label: "Guruhlar", icon: Boxes },
  { href: "/admin/finance", label: "Moliya", icon: Wallet },
  { href: "/admin/settings", label: "Sozlamalar", icon: Settings },
  { href: "/admin/profile", label: "Profil", icon: User },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell role="admin" items={items}>
      {children}
    </AppShell>
  );
}
