"use client";

import * as React from "react";
import { Settings as SettingsIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AvatarLibrary } from "@/components/shared/settings/avatar-library";

const TABS = [
  { id: "system", label: "Tizim sozlamalari" },
  { id: "avatar", label: "Avatar sozlamalari" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [tab, setTab] = React.useState<TabId>("system");

  return (
    <div>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <SettingsIcon className="h-6 w-6" /> Sozlamalar
          </span>
        }
        description="Tizim va avatar sozlamalari"
      />

      <div className="mb-6 flex gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "relative -mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "system" ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Ko&apos;rinish</CardTitle>
              <CardDescription>Yorug&apos; yoki tungi rejim</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("light")}
              >
                Yorug&apos;
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("dark")}
              >
                Tungi
              </Button>
              <Button
                variant={theme === "system" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("system")}
              >
                Tizim
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tizim haqida</CardTitle>
              <CardDescription>EduBase boshqaruv tizimi</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-muted-foreground">
              <p>Versiya: 2.0.0</p>
              <p>Valyuta: so&apos;m (UZS)</p>
              <p>Vaqt mintaqasi: Asia/Tashkent</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <AvatarLibrary />
      )}
    </div>
  );
}
