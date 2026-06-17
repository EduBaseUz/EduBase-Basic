"use client";

import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
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
import { useCourse } from "@/hooks/use-courses";
import { useGroups } from "@/hooks/use-groups";
import { formatUZS } from "@/lib/utils";

const BASE = "/admin/courses";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export function CourseDetail({ id }: { id: string }) {
  const { data: course, isLoading } = useCourse(id);
  const { data: groups } = useGroups();

  if (isLoading || !course) {
    return <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>;
  }

  const relatedGroups = (groups?.items ?? []).filter(
    (g) => g.courseId === course.id,
  );

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={course.title}
        action={
          <div className="flex gap-2">
            <Link
              href={BASE}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ArrowLeft className="h-4 w-4" /> Orqaga
            </Link>
            <Link
              href={`${BASE}/${id}/edit`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Pencil className="h-4 w-4" /> Tahrirlash
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
            <InfoRow label="Nomi" value={course.title} />
            <InfoRow label="Tavsif" value={course.description || "—"} />
            <InfoRow
              label="Davomiyligi"
              value={`${course.durationMonths} oy`}
            />
            <InfoRow label="Oylik darslar" value={course.lessonsPerMonth} />
            <InfoRow
              label="1 kishilik to'lov"
              value={formatUZS(course.mentorRatePerStudent)}
            />
            <InfoRow
              label="Holat"
              value={
                course.status === "active" ? (
                  <Badge variant="success">Faol</Badge>
                ) : (
                  <Badge variant="outline">Arxiv</Badge>
                )
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Oylik narxlar</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Oy</TableHead>
                  <TableHead>Narx</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {course.monthlyPrices.map((mp) => (
                  <TableRow key={mp.monthIndex}>
                    <TableCell>{mp.monthIndex}-oy</TableCell>
                    <TableCell>{formatUZS(mp.price)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Bu mutaxassislikdagi guruhlar</CardTitle>
        </CardHeader>
        <CardContent>
          {!relatedGroups.length ? (
            <p className="text-sm text-muted-foreground">Guruh yo'q.</p>
          ) : (
            <ul className="space-y-2">
              {relatedGroups.map((g) => (
                <li
                  key={g.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <span>{g.name}</span>
                  <Link
                    href={`/admin/groups/${g.id}`}
                    className={buttonVariants({ variant: "ghost", size: "sm" })}
                  >
                    Ko'rish
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
