"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMyGroups } from "@/hooks/use-academic";

const DAY_LABELS: Record<string, string> = {
  mon: "Du", tue: "Se", wed: "Ch", thu: "Pa", fri: "Ju", sat: "Sh", sun: "Ya",
};

export default function StudentGroupsPage() {
  const { data: groups, isLoading } = useMyGroups();

  return (
    <div>
      <PageHeader title="Guruhlarim" description="Siz a'zo bo'lgan guruhlar" />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
      ) : !groups?.length ? (
        <p className="text-sm text-muted-foreground">
          Siz hech qaysi guruhga a'zo emassiz.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <Link key={g.id} href={`/student/groups/${g.id}`}>
              <Card className="transition-colors hover:bg-accent/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{g.name}</CardTitle>
                    <Badge variant={g.status === "active" ? "success" : "outline"}>
                      {g.status}
                    </Badge>
                  </div>
                  <CardDescription>
                    {g.schedule.days.map((d) => DAY_LABELS[d] ?? d).join(", ")}{" "}
                    {g.schedule.startTime}-{g.schedule.endTime}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {g.schedule.room
                    ? `Xona: ${g.schedule.room}`
                    : "Xona belgilanmagan"}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
