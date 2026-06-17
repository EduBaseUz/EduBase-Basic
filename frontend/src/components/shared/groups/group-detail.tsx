"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, UserPlus, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { useToast } from "@/components/ui/toast";
import {
  useGroup,
  useSetGroupMentors,
  useAddStudent,
  useRemoveStudent,
} from "@/hooks/use-groups";
import { useUsers } from "@/hooks/use-users";
import { ApiError } from "@/lib/api";
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

export function GroupDetail({ id }: { id: string }) {
  const { data, isLoading } = useGroup(id);
  const { data: mentors } = useUsers({ role: "mentor" });
  const { data: students } = useUsers({ role: "student" });
  const setMentors = useSetGroupMentors();
  const addStudent = useAddStudent();
  const removeStudent = useRemoveStudent();
  const { toast } = useToast();
  const [studentToAdd, setStudentToAdd] = React.useState("");

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>;
  }

  const g = data.group;
  const enrolled = data.students.filter((s) => s.enrollment.status === "active");
  const enrolledIds = new Set(enrolled.map((s) => s.user.id));
  const mentorIds = new Set(g.mentorIds);

  const toggleMentor = async (mid: string) => {
    const next = new Set(mentorIds);
    if (next.has(mid)) next.delete(mid);
    else next.add(mid);
    try {
      await setMentors.mutateAsync({ id, mentorIds: Array.from(next) });
      toast({ title: "Mentorlar yangilandi", variant: "success" });
    } catch (err) {
      toast({
        title: "Xatolik",
        description: err instanceof ApiError ? err.message : "Xatolik",
        variant: "error",
      });
    }
  };

  const onAdd = async () => {
    if (!studentToAdd) return;
    try {
      await addStudent.mutateAsync({ id, studentId: studentToAdd });
      toast({ title: "O'quvchi qo'shildi", variant: "success" });
      setStudentToAdd("");
    } catch (err) {
      toast({
        title: "Qo'shib bo'lmadi",
        description: err instanceof ApiError ? err.message : "Xatolik",
        variant: "error",
      });
    }
  };

  const onRemove = async (sid: string) => {
    try {
      await removeStudent.mutateAsync({ id, studentId: sid });
      toast({ title: "O'quvchi chiqarildi", variant: "success" });
    } catch (err) {
      toast({
        title: "Xatolik",
        description: err instanceof ApiError ? err.message : "Xatolik",
        variant: "error",
      });
    }
  };

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
            <InfoRow
              label="Mutaxassislik"
              value={data.course?.title ?? "—"}
            />
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
            <div className="flex flex-wrap gap-2">
              {mentors?.items.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleMentor(m.id)}
                  className={`rounded-md border px-3 py-1 text-sm transition-colors ${
                    mentorIds.has(m.id)
                      ? "bg-primary text-primary-foreground"
                      : "bg-background"
                  }`}
                >
                  {m.fullName}
                </button>
              ))}
              {!mentors?.items.length && (
                <span className="text-sm text-muted-foreground">
                  Mentorlar yo'q
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>
            O'quvchilar ({enrolled.length}/{g.studentLimit})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>O'quvchi qo'shish</Label>
            <div className="flex gap-2">
              <Select
                value={studentToAdd}
                onChange={(e) => setStudentToAdd(e.target.value)}
              >
                <option value="">— Tanlang —</option>
                {students?.items
                  .filter((s) => !enrolledIds.has(s.id))
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({formatPhoneDisplay(s.phone)})
                    </option>
                  ))}
              </Select>
              <Button onClick={onAdd} disabled={!studentToAdd || addStudent.isPending}>
                <UserPlus className="h-4 w-4" /> Qo'shish
              </Button>
            </div>
          </div>

          <div className="divide-y rounded-md border">
            {enrolled.map((s) => (
              <div
                key={s.user.id}
                className="flex items-center justify-between px-3 py-2 text-sm"
              >
                <span>
                  {s.user.fullName}{" "}
                  <span className="text-muted-foreground">
                    {formatPhoneDisplay(s.user.phone)}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemove(s.user.id)}
                >
                  <X className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            {!enrolled.length && (
              <p className="px-3 py-4 text-sm text-muted-foreground">
                Hozircha o'quvchi yo'q
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
