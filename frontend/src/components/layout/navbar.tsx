"use client";

import { usePathname } from "next/navigation";
import { PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/layout/user-menu";
import type { NavItem } from "@/components/layout/sidebar";
import type { User } from "@/types";

/** Pick the deepest nav label whose href matches the current path. */
function currentTitle(items: NavItem[], pathname: string): string {
  let best = "";
  let bestLen = -1;
  const consider = (href?: string, label?: string) => {
    if (!href || !label) return;
    const matches = pathname === href || pathname.startsWith(href + "/");
    if (matches && href.length > bestLen) {
      bestLen = href.length;
      best = label;
    }
  };
  for (const it of items) {
    consider(it.href, it.label);
    it.children?.forEach((c) => consider(c.href, c.label));
  }
  return best;
}

export function Navbar({
  user,
  items,
  onToggleSidebar,
}: {
  user: User;
  items: NavItem[];
  onToggleSidebar: () => void;
}) {
  const pathname = usePathname();
  const title = currentTitle(items, pathname);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-3 md:px-5">
      <div className="flex min-w-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          aria-label="Menyuni ochish/yopish"
        >
          <PanelLeft className="h-5 w-5" />
        </Button>
        {title && (
          <div className="flex min-w-0 items-center gap-2">
            <span className="select-none text-muted-foreground/40">/</span>
            <span className="truncate text-sm font-semibold tracking-tight">
              {title}
            </span>
          </div>
        )}
      </div>

      <UserMenu user={user} />
    </header>
  );
}
