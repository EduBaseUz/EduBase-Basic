"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, GraduationCap, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavChild {
  href: string;
  label: string;
}

export interface NavItem {
  href?: string;
  label: string;
  icon: LucideIcon;
  children?: NavChild[];
}

interface SidebarProps {
  items: NavItem[];
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ items, open, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobil uchun qoraytirilgan fon */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r bg-card transition-all duration-300 md:static",
          open
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden md:border-0",
        )}
      >
        <div className="flex h-14 shrink-0 items-center gap-2 border-b px-5">
          <GraduationCap className="h-6 w-6" />
          <span className="text-lg font-semibold tracking-tight">EduBase</span>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((item) =>
            item.children ? (
              <SidebarGroup
                key={item.label}
                item={item}
                pathname={pathname}
                onNavigate={onClose}
              />
            ) : (
              <SidebarLink
                key={item.href}
                href={item.href!}
                label={item.label}
                icon={item.icon}
                active={pathname === item.href}
                onNavigate={onClose}
              />
            ),
          )}
        </nav>
      </aside>
    </>
  );
}

function SidebarLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={() => {
        // Mobil ekranda link bosilganda sidebarni yopamiz.
        if (window.innerWidth < 768) onNavigate();
      }}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-secondary text-secondary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}

function SidebarGroup({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  const childActive = item.children!.some((c) => pathname.startsWith(c.href));
  const [open, setOpen] = React.useState(childActive);

  React.useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          childActive
            ? "text-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="mt-1 space-y-1 pl-4">
          {item.children!.map((c) => {
            const active = pathname.startsWith(c.href);
            return (
              <Link
                key={c.href}
                href={c.href}
                onClick={() => {
                  if (window.innerWidth < 768) onNavigate();
                }}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-secondary font-medium text-secondary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />
                {c.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
