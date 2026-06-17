"use client";

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

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <SettingsIcon className="h-6 w-6" /> Sozlamalar
          </span>
        }
        description="Tizim sozlamalari"
      />
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ko'rinish</CardTitle>
            <CardDescription>Yorug' yoki tungi rejim</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("light")}
            >
              Yorug'
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
            <p>Versiya: 0.1.0</p>
            <p>Valyuta: so'm (UZS)</p>
            <p>Vaqt mintaqasi: Asia/Tashkent</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
