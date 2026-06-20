"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { ChevronDown, LogOut, Moon, Sun } from "lucide-react";
import { cn, nameInitials, shortName } from "@/lib/utils";
import { useLogout } from "@/hooks/use-auth";
import { roleLabels } from "@/lib/auth";
import type { User } from "@/types";

function Avatar({
  user,
  name,
  size = 32,
}: {
  user: User;
  name: string;
  size?: number;
}) {
  return (
    <span
      className="relative inline-flex shrink-0 overflow-hidden rounded-full border bg-muted"
      style={{ width: size, height: size }}
    >
      {user.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatarUrl}
          alt={name}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-primary/10 text-xs font-semibold text-primary">
          {nameInitials(user)}
        </span>
      )}
    </span>
  );
}

export function UserMenu({ user }: { user: User }) {
  const router = useRouter();
  const logout = useLogout();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => setMounted(true), []);

  // Tashqariga bosilganda yoki Escape bosilganda yopiladi.
  React.useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onLogout = async () => {
    setOpen(false);
    await logout.mutateAsync();
    router.push("/login");
    router.refresh();
  };

  const isDark = mounted && theme === "dark";
  const name = shortName(user);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full py-0.5 pl-0.5 pr-1 transition-colors hover:bg-accent sm:pr-2"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar user={user} name={name} />
        <span className="hidden text-left sm:block">
          <span className="block max-w-[10rem] truncate text-sm font-medium leading-tight">
            {name}
          </span>
          <span className="block text-xs leading-tight text-muted-foreground">
            {roleLabels[user.role]}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "hidden h-4 w-4 text-muted-foreground transition-transform sm:block",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          <div className="flex items-center gap-3 px-3 py-3">
            <Avatar user={user} name={name} size={40} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {roleLabels[user.role]}
              </p>
            </div>
          </div>

          <div className="my-1 h-px bg-border" />

          <div className="px-2 py-1.5">
            <p className="px-1 pb-1.5 text-xs font-medium text-muted-foreground">
              Mavzu
            </p>
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                  !isDark
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Sun className="h-3.5 w-3.5" /> Yorug&apos;
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                  isDark
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Moon className="h-3.5 w-3.5" /> Tungi
              </button>
            </div>
          </div>

          <div className="my-1 h-px bg-border" />

          <button
            type="button"
            onClick={onLogout}
            disabled={logout.isPending}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />
            {logout.isPending ? "Chiqilmoqda..." : "Chiqish"}
          </button>
        </div>
      )}
    </div>
  );
}
