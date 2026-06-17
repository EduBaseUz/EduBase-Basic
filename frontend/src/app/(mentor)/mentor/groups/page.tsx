"use client";

import Link from "next/link";
import { Boxes } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { useGroups } from "@/hooks/use-groups";
import { useCourses } from "@/hooks/use-courses";

const DAY_LABELS: Record<string, string> = {
  mon: "Du", tue: "Se", wed: "Ch", thu: "Pa", fri: "Ju", sat: "Sh", sun: "Ya",
};

export default function MentorGroupsPage() {
  const { data, isLoading } = useGroups();
  const { data: courses } = useCourses();

  const courseName = (id: string) =>
    courses?.items.find((c) => c.id === id)?.title ?? "—";

  return (
    <div>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Boxes className="h-6 w-6" /> Guruhlarim
          </span>
        }
        description="Siz biriktirilgan guruhlar"
      />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
      ) : !data?.items.length ? (
        <p className="text-sm text-muted-foreground">
          Sizga biriktirilgan guruh yo'q.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((g) => (
            <Card key={g.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{g.name}</CardTitle>
                  <Badge variant={g.status === "active" ? "success" : "outline"}>
                    {g.status}
                  </Badge>
                </div>
                <CardDescription>{courseName(g.courseId)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">
                  {g.schedule.days.map((d) => DAY_LABELS[d] ?? d).join(", ")}{" "}
                  {g.schedule.startTime}-{g.schedule.endTime}
                  {g.schedule.room ? ` · ${g.schedule.room}` : ""}
                </p>
                <div className="flex gap-2">
                  <Link
                    href={`/mentor/groups/${g.id}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Ko'rish
                  </Link>
                  <Link
                    href={`/mentor/journal?group=${g.id}`}
                    className={buttonVariants({ size: "sm" })}
                  >
                    Jurnal
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
