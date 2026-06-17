"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
import { useGroup } from "@/hooks/use-groups";
import { formatDate } from "@/lib/utils";
import { dayLabels } from "@/components/shared/groups/group-config";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export default function StudentGroupDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { data, isLoading } = useGroup(params.id);

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>;
  }

  const g = data.group;
  const students = data.students.filter((s) => s.enrollment.status === "active");

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={g.name}
        action={
          <Link
            href="/student/groups"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ArrowLeft className="h-4 w-4" /> Orqaga
          </Link>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Guruh ma'lumotlari</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow label="Nomi" value={g.name} />
            <InfoRow label="Mutaxassislik" value={data.course?.title ?? "—"} />
            <InfoRow
              label="Jadval"
              value={`${dayLabels(g.schedule.days)} ${g.schedule.startTime}-${g.schedule.endTime}`}
            />
            <InfoRow label="Xona" value={g.schedule.room || "—"} />
            <InfoRow label="Boshlanish" value={formatDate(g.startDate)} />
            <InfoRow
              label="Holat"
              value={
                <Badge variant={g.status === "active" ? "success" : "outline"}>
                  {g.status}
                </Badge>
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mentor(lar)</CardTitle>
          </CardHeader>
          <CardContent>
            {!data.mentors.length ? (
              <p className="text-sm text-muted-foreground">
                Mentor biriktirilmagan.
              </p>
            ) : (
              <ul className="space-y-2">
                {data.mentors.map((m) => (
                  <li key={m.id} className="rounded-md border px-3 py-2 text-sm">
                    <p className="font-medium">{m.fullName}</p>
                    {(m.specializations?.length || m.specialization) && (
                      <p className="text-muted-foreground">
                        {(m.specializations?.length
                          ? m.specializations
                          : [m.specialization]
                        ).join(", ")}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Guruhdoshlar ({students.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {!students.length ? (
            <p className="text-sm text-muted-foreground">O'quvchi yo'q.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>T/R</TableHead>
                  <TableHead>F.I.O.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s, i) => (
                  <TableRow key={s.user.id}>
                    <TableCell className="text-muted-foreground">
                      {i + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {s.user.fullName}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
