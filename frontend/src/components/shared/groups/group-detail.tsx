"use client";

import Link from "next/link";
import { ArrowLeft, Pencil, Settings2 } from "lucide-react";
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
import { formatPhoneDisplay, formatDate } from "@/lib/utils";
import { GROUP_BASE, dayLabels } from "@/components/shared/groups/group-config";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function OutcomeBadge({ outcome }: { outcome?: string }) {
  switch (outcome) {
    case "passed":
      return <Badge variant="success">O&apos;tdi</Badge>;
    case "repeat":
      return <Badge variant="warning">Yiqildi</Badge>;
    case "transferred":
      return <Badge variant="outline">Ko&apos;chirildi</Badge>;
    case "dropped":
      return <Badge variant="destructive">Chiqarildi</Badge>;
    default:
      return <Badge variant="outline">—</Badge>;
  }
}

export function GroupDetail({ id }: { id: string }) {
  const { data, isLoading } = useGroup(id);

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>;
  }

  const g = data.group;
  const enrolled = data.students.filter((s) => s.enrollment.status === "active");
  const past = data.students
    .filter((s) => s.enrollment.status === "left")
    .sort((a, b) =>
      (b.enrollment.leftAt ?? "").localeCompare(a.enrollment.leftAt ?? ""),
    );

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={g.name}
        action={
          <div className="flex gap-2">
            <Link
              href={GROUP_BASE}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ArrowLeft className="h-4 w-4" /> Orqaga
            </Link>
            <Link
              href={`${GROUP_BASE}/${id}/edit`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Pencil className="h-4 w-4" /> Tahrirlash
            </Link>
            <Link
              href={`${GROUP_BASE}/${id}/settings`}
              className={buttonVariants({ size: "sm" })}
            >
              <Settings2 className="h-4 w-4" /> Sozlamalar
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Umumiy ma'lumot</CardTitle>
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
            <CardTitle>Mentorlar</CardTitle>
          </CardHeader>
          <CardContent>
            {!data.mentors.length ? (
              <p className="text-sm text-muted-foreground">
                Mentor biriktirilmagan.
              </p>
            ) : (
              <ul className="space-y-2">
                {data.mentors.map((m) => (
                  <li
                    key={m.id}
                    className="rounded-md border px-3 py-2 text-sm"
                  >
                    <p className="font-medium">{m.fullName}</p>
                    <p className="text-muted-foreground">
                      {formatPhoneDisplay(m.phone)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>
            O'quvchilar ({enrolled.length}/{g.studentLimit})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!enrolled.length ? (
            <p className="text-sm text-muted-foreground">Hozircha o'quvchi yo'q.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>T/R</TableHead>
                  <TableHead>F.I.O.</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Qo'shilgan sana</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrolled.map((s, i) => (
                  <TableRow key={s.user.id}>
                    <TableCell className="text-muted-foreground">
                      {i + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {s.user.fullName}
                    </TableCell>
                    <TableCell>{formatPhoneDisplay(s.user.phone)}</TableCell>
                    <TableCell>{formatDate(s.enrollment.joinedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {past.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Guruh tarixi ({past.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>T/R</TableHead>
                  <TableHead>F.I.O.</TableHead>
                  <TableHead>Natija</TableHead>
                  <TableHead>Chiqqan sana</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {past.map((s, i) => (
                  <TableRow key={s.enrollment.id}>
                    <TableCell className="text-muted-foreground">
                      {i + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {s.user.fullName}
                    </TableCell>
                    <TableCell>
                      <OutcomeBadge outcome={s.enrollment.outcome} />
                    </TableCell>
                    <TableCell>
                      {s.enrollment.leftAt ? formatDate(s.enrollment.leftAt) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
