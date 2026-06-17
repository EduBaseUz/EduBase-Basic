"use client";

import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMyAttendance, useMyGrades } from "@/hooks/use-academic";
import { letterColor } from "@/lib/grades";
import { formatDate } from "@/lib/utils";
import type { AttendanceStatus } from "@/types";

const ATT_LABELS: Record<AttendanceStatus, string> = {
  present: "Keldi",
  late: "Kech qoldi",
  excused: "Sababli",
  absent: "Kelmadi",
};

function attBadge(s: AttendanceStatus) {
  if (s === "present") return <Badge variant="success">{ATT_LABELS[s]}</Badge>;
  if (s === "late") return <Badge variant="warning">{ATT_LABELS[s]}</Badge>;
  if (s === "absent") return <Badge variant="destructive">{ATT_LABELS[s]}</Badge>;
  return <Badge variant="outline">{ATT_LABELS[s]}</Badge>;
}

export default function AcademicPage() {
  const { data: attendance, isLoading: attLoading } = useMyAttendance();
  const { data: grades, isLoading: gradesLoading } = useMyGrades();

  return (
    <div className="space-y-6">
      <PageHeader
        title="O'zlashtirish"
        description="Davomat va baholaringiz"
      />

      <Card>
        <CardHeader>
          <CardTitle>Baholar</CardTitle>
        </CardHeader>
        <CardContent>
          {gradesLoading ? (
            <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
          ) : !grades?.length ? (
            <p className="text-sm text-muted-foreground">Hozircha baho yo'q.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>T/R</TableHead>
                  <TableHead>Sana</TableHead>
                  <TableHead>Mavzu</TableHead>
                  <TableHead>Baho</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.map((g, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-muted-foreground">
                      {i + 1}
                    </TableCell>
                    <TableCell>{formatDate(g.date)}</TableCell>
                    <TableCell>{g.topic}</TableCell>
                    <TableCell
                      className={`text-lg font-bold ${letterColor(g.letter)}`}
                    >
                      {g.letter}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Davomat</CardTitle>
        </CardHeader>
        <CardContent>
          {attLoading ? (
            <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
          ) : !attendance?.length ? (
            <p className="text-sm text-muted-foreground">
              Hozircha davomat yo'q.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sana</TableHead>
                  <TableHead>Mavzu</TableHead>
                  <TableHead>Holat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendance.map((a, i) => (
                  <TableRow key={i}>
                    <TableCell>{formatDate(a.date)}</TableCell>
                    <TableCell>{a.topic}</TableCell>
                    <TableCell>{attBadge(a.status)}</TableCell>
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
