"use client";

import { useRouter } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useLogout } from "@/hooks/use-auth";
import { roleLabels } from "@/lib/auth";
import type { User } from "@/types";

export function Navbar({
  user,
  onToggleSidebar,
}: {
  user: User;
  onToggleSidebar: () => void;
}) {
  const router = useRouter();
  const logout = useLogout();

  const onLogout = async () => {
    await logout.mutateAsync();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4 md:px-6">
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleSidebar}
        aria-label="Menyuni ochish/yopish"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <div className="ml-auto flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium leading-tight">{user.fullName}</p>
          <p className="text-xs text-muted-foreground">
            {roleLabels[user.role]}
          </p>
        </div>
        <ThemeToggle />
        <Button
          variant="outline"
          size="sm"
          onClick={onLogout}
          disabled={logout.isPending}
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Chiqish</span>
        </Button>
      </div>
    </header>
  );
}
