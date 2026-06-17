"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardList } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { useGroup, useGroupRating } from "@/hooks/use-groups";
import { formatPhoneDisplay, formatDate } from "@/lib/utils";
import { dayLabels } from "@/components/shared/groups/group-config";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export default function MentorGroupDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = params.id;
  const { data, isLoading } = useGroup(id);
  const { data: rating } = useGroupRating(id);

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>;
  }

  const g = data.group;
  const enrolled = data.students.filter((s) => s.enrollment.status === "active");
  const statById = new Map(
    (rating ?? []).map((r) => [r.studentId, r]),
  );

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={g.name}
        action={
          <div className="flex gap-2">
            <Link
              href="/mentor/groups"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ArrowLeft className="h-4 w-4" /> Orqaga
            </Link>
            <Link
              href={`/mentor/journal?group=${id}`}
              className={buttonVariants({ size: "sm" })}
            >
              <ClipboardList className="h-4 w-4" /> Jurnalni ochish
            </Link>
          </div>
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Guruh ma'lumotlari</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-x-8 sm:grid-cols-2">
          <div>
            <InfoRow label="Nomi" value={g.name} />
            <InfoRow label="Mutaxassislik" value={data.course?.title ?? "—"} />
            <InfoRow
              label="Jadval"
              value={`${dayLabels(g.schedule.days)} ${g.schedule.startTime}-${g.schedule.endTime}`}
            />
          </div>
          <div>
            <InfoRow label="Xona" value={g.schedule.room || "—"} />
            <InfoRow label="Boshlanish" value={formatDate(g.startDate)} />
            <InfoRow
              label="O'quvchilar"
              value={`${enrolled.length} / ${g.studentLimit}`}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>O'quvchilar</CardTitle>
        </CardHeader>
        <CardContent>
          {!enrolled.length ? (
            <p className="text-sm text-muted-foreground">
              Guruhda o'quvchi yo'q.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>T/R</TableHead>
                  <TableHead>F.I.O.</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Davomat</TableHead>
                  <TableHead>O'rtacha baho (20 dan)</TableHead>
                  <TableHead>Holat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrolled.map((s, i) => {
                  const stat = statById.get(s.user.id);
                  return (
                    <TableRow key={s.user.id}>
                      <TableCell className="text-muted-foreground">
                        {i + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        {s.user.fullName}
                      </TableCell>
                      <TableCell>{formatPhoneDisplay(s.user.phone)}</TableCell>
                      <TableCell>
                        {stat
                          ? `${Math.round(stat.attendanceRatio * 100)}%`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {stat && stat.gradeCount > 0
                          ? stat.average.toFixed(1)
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="success">Faol</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
