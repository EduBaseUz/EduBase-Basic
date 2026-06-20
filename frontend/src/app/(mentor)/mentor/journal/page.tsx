"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  ArrowLeft,
  CalendarRange,
  ClipboardList,
  Pencil,
  Plus,
  Trash2,
  Users as UsersIcon,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { useGroups, useGroup } from "@/hooks/use-groups";
import {
  useLessons,
  useLessonRoster,
  useCreateLesson,
  useUpdateLesson,
  useDeleteLesson,
  useSetAttendance,
  useSetGrades,
} from "@/hooks/use-journal";
import { formatDate, cn } from "@/lib/utils";
import { sumToLetter, letterColor } from "@/lib/grades";
import { ApiError } from "@/lib/api";
import type { AttendanceStatus, PriceEntry } from "@/types";

const dateOnly = (s: string) => s.slice(0, 10);

const ATT_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: "present", label: "Keldi" },
  { value: "late", label: "Kech qoldi" },
  { value: "excused", label: "Sababli" },
  { value: "absent", label: "Kelmadi" },
];

function attSelectColor(status: AttendanceStatus): string {
  switch (status) {
    case "present":
      return "border-green-500 text-green-700 dark:text-green-400";
    case "late":
      return "border-yellow-500 text-yellow-700 dark:text-yellow-400";
    case "absent":
      return "border-destructive text-destructive";
    default:
      return "text-muted-foreground";
  }
}

function JournalInner() {
  const params = useSearchParams();
  const [groupId, setGroupId] = React.useState<string>("");
  const [period, setPeriod] = React.useState<PriceEntry | null>(null);
  const [lessonId, setLessonId] = React.useState<string | null>(null);

  // Guruh sahifasidan ?group= bilan kelinsa, o'sha guruhni oldindan tanlaymiz.
  React.useEffect(() => {
    const q = params.get("group");
    if (q) setGroupId(q);
  }, [params]);

  return (
    <div>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <ClipboardList className="h-6 w-6" /> Jurnal
          </span>
        }
        description="Guruhni, so'ng oyni tanlab darslarni kiriting"
      />

      {!groupId ? (
        <GroupsStep onPick={setGroupId} />
      ) : !period ? (
        <MonthsStep
          groupId={groupId}
          onBack={() => setGroupId("")}
          onPick={setPeriod}
        />
      ) : !lessonId ? (
        <LessonsStep
          groupId={groupId}
          period={period}
          onBack={() => setPeriod(null)}
          onOpen={setLessonId}
        />
      ) : (
        <LessonRosterEditor
          groupId={groupId}
          lessonId={lessonId}
          onBack={() => setLessonId(null)}
        />
      )}
    </div>
  );
}

/* ----------------------------- 1) Guruhlar ----------------------------- */

function GroupsStep({ onPick }: { onPick: (id: string) => void }) {
  const { data, isLoading } = useGroups();

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>;
  }
  if (!data?.items.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Sizga biriktirilgan guruh yo&apos;q.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.items.map((g) => (
        <button
          key={g.id}
          type="button"
          onClick={() => onPick(g.id)}
          className="flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UsersIcon className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium">{g.name}</span>
            <span className="text-xs text-muted-foreground">
              {g.status === "active" ? "Faol" : g.status}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------ 2) Oylar ------------------------------- */

function MonthsStep({
  groupId,
  onBack,
  onPick,
}: {
  groupId: string;
  onBack: () => void;
  onPick: (p: PriceEntry) => void;
}) {
  const { data, isLoading } = useGroup(groupId);
  const periods = React.useMemo(
    () =>
      [...(data?.course?.priceEntries ?? [])].sort((a, b) =>
        dateOnly(a.startDate).localeCompare(dateOnly(b.startDate)),
      ),
    [data],
  );

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">{data?.group.name ?? "Guruh"}</h2>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
      ) : !periods.length ? (
        <p className="text-sm text-muted-foreground">
          Bu mutaxassislik uchun oylik narxlar (oylar) kiritilmagan. Avval admin
          sozlamalardan kiritishi kerak.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {periods.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onPick(p)}
              className="flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CalendarRange className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium">
                  {formatDate(p.startDate)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(p.endDate)} gacha
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ 3) Darslar ----------------------------- */

interface LessonFormValues {
  date: string;
  topic: string;
  kind: "main" | "extra";
  homeworkTitle: string;
  homeworkDescription: string;
}

function LessonsStep({
  groupId,
  period,
  onBack,
  onOpen,
}: {
  groupId: string;
  period: PriceEntry;
  onBack: () => void;
  onOpen: (id: string) => void;
}) {
  const { data: group } = useGroup(groupId);
  const { data, isLoading } = useLessons(groupId);
  const createLesson = useCreateLesson();
  const deleteLesson = useDeleteLesson();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [toDelete, setToDelete] = React.useState<string | null>(null);
  const [editId, setEditId] = React.useState<string | null>(null);

  const lessonsPerMonth = group?.course?.lessonsPerMonth ?? 0;
  const start = dateOnly(period.startDate);
  const end = dateOnly(period.endDate);

  const inPeriod = (data?.items ?? [])
    .filter((l) => dateOnly(l.date) >= start && dateOnly(l.date) <= end)
    .sort((a, b) => dateOnly(a.date).localeCompare(dateOnly(b.date)));
  const mainCount = inPeriod.filter((l) => l.kind !== "extra").length;
  const mainFull = lessonsPerMonth > 0 && mainCount >= lessonsPerMonth;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<LessonFormValues>();
  const kind = watch("kind");

  const openCreate = () => {
    const today = new Date().toISOString().slice(0, 10);
    const within = today >= start && today <= end;
    reset({
      date: within ? today : start,
      topic: "",
      kind: mainFull ? "extra" : "main",
      homeworkTitle: "",
      homeworkDescription: "",
    });
    setOpen(true);
  };

  const onSubmit = handleSubmit(async (v) => {
    if (dateOnly(v.date) < start || dateOnly(v.date) > end) {
      toast({
        title: "Sana shu oy oralig'ida bo'lishi kerak",
        variant: "error",
      });
      return;
    }
    if (v.kind === "main" && mainFull) {
      toast({
        title: `Asosiy darslar to'ldi (${lessonsPerMonth} ta)`,
        description: "Qo'shimcha dars sifatida qo'shing",
        variant: "error",
      });
      return;
    }
    try {
      await createLesson.mutateAsync({
        groupId,
        body: {
          date: v.date,
          topic: v.topic,
          kind: v.kind,
          homeworkTitle: v.homeworkTitle,
          homeworkDescription: v.homeworkDescription,
        },
      });
      toast({ title: "Dars qo'shildi", variant: "success" });
      setOpen(false);
    } catch (err) {
      toast({
        title: "Xatolik",
        description: err instanceof ApiError ? err.message : "Xatolik",
        variant: "error",
      });
    }
  });

  const onDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteLesson.mutateAsync(toDelete);
      toast({ title: "O'chirildi", variant: "success" });
      setToDelete(null);
    } catch (err) {
      toast({
        title: "Xatolik",
        description: err instanceof ApiError ? err.message : "Xatolik",
        variant: "error",
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <CardTitle>Darslar</CardTitle>
            <p className="text-xs text-muted-foreground">
              {formatDate(period.startDate)} — {formatDate(period.endDate)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={mainFull ? "destructive" : "secondary"}>
            Asosiy: {mainCount}
            {lessonsPerMonth > 0 ? `/${lessonsPerMonth}` : ""}
          </Badge>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Yangi dars
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
        ) : !inPeriod.length ? (
          <p className="text-sm text-muted-foreground">
            Bu oy uchun hali dars yo&apos;q.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>T/R</TableHead>
                <TableHead>Sana</TableHead>
                <TableHead>Mavzu</TableHead>
                <TableHead>Tur</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inPeriod.map((l, i) => (
                <TableRow key={l.id}>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  <TableCell>{formatDate(l.date)}</TableCell>
                  <TableCell>{l.topic}</TableCell>
                  <TableCell>
                    {l.kind === "extra" ? (
                      <Badge variant="outline">Qo&apos;shimcha</Badge>
                    ) : (
                      <Badge variant="secondary">Asosiy</Badge>
                    )}
                  </TableCell>
                  <TableCell className="flex justify-end gap-1">
                    <Button size="sm" variant="outline" onClick={() => onOpen(l.id)}>
                      Ochish
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Tahrirlash"
                      onClick={() => setEditId(l.id)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="O'chirish"
                      onClick={() => setToDelete(l.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle>Yangi dars</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label>
                Sana <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                min={start}
                max={end}
                aria-invalid={!!errors.date}
                {...register("date", { required: true })}
              />
              <p className="text-xs text-muted-foreground">
                {formatDate(period.startDate)} — {formatDate(period.endDate)}{" "}
                oralig&apos;ida
              </p>
            </div>
            <div className="space-y-2">
              <Label>
                Mavzu <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="Masalan: O'zgaruvchilar va tiplar"
                aria-invalid={!!errors.topic}
                {...register("topic", { required: true })}
              />
              {errors.topic && (
                <p className="text-xs text-destructive">Mavzuni kiriting</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Uyga vazifa (sarlavha)</Label>
              <Input
                placeholder="Masalan: 1-2 mashqlar"
                {...register("homeworkTitle")}
              />
            </div>
            <div className="space-y-2">
              <Label>Uyga vazifa (tavsif)</Label>
              <Textarea
                placeholder="Vazifa haqida qisqacha izoh"
                {...register("homeworkDescription")}
              />
            </div>
            <div className="space-y-2">
              <Label>Dars turi</Label>
              <Select {...register("kind")}>
                <option value="main" disabled={mainFull}>
                  Asosiy dars{mainFull ? " (limit to'ldi)" : ""}
                </option>
                <option value="extra">Qo&apos;shimcha dars</option>
              </Select>
              <p className="text-xs text-muted-foreground">
                {kind === "extra"
                  ? "Qo'shimcha dars oylik songa kirmaydi (cheksiz)."
                  : "Asosiy dars oylik darslar soniga kiradi."}
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Bekor qilish
              </Button>
              <Button type="submit" disabled={createLesson.isPending}>
                Saqlash
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Darsni o'chirish"
        description="Bu darsni o'chirmoqchimisiz? Davomat va baholar ham o'chiriladi."
        confirmLabel="O'chirish"
        variant="destructive"
        loading={deleteLesson.isPending}
        onConfirm={onDelete}
      />

      {editId && (
        <EditLessonDialog
          lessonId={editId}
          min={start}
          max={end}
          onClose={() => setEditId(null)}
        />
      )}
    </Card>
  );
}

function EditLessonDialog({
  lessonId,
  min,
  max,
  onClose,
}: {
  lessonId: string;
  min: string;
  max: string;
  onClose: () => void;
}) {
  const { data, isLoading } = useLessonRoster(lessonId);
  const updateLesson = useUpdateLesson();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LessonFormValues>();

  React.useEffect(() => {
    if (data?.lesson) {
      reset({
        date: data.lesson.date.slice(0, 10),
        topic: data.lesson.topic,
        kind: data.lesson.kind === "extra" ? "extra" : "main",
        homeworkTitle: data.homework?.title ?? "",
        homeworkDescription: data.homework?.description ?? "",
      });
    }
  }, [data, reset]);

  const onSubmit = handleSubmit(async (v) => {
    try {
      await updateLesson.mutateAsync({
        id: lessonId,
        body: {
          date: v.date,
          topic: v.topic,
          kind: v.kind,
          homeworkTitle: v.homeworkTitle,
          homeworkDescription: v.homeworkDescription,
        },
      });
      toast({ title: "Dars yangilandi", variant: "success" });
      onClose();
    } catch (err) {
      toast({
        title: "Xatolik",
        description: err instanceof ApiError ? err.message : "Xatolik",
        variant: "error",
      });
    }
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle>Darsni tahrirlash</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label>
                Sana <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                min={min}
                max={max}
                aria-invalid={!!errors.date}
                {...register("date", { required: true })}
              />
            </div>
            <div className="space-y-2">
              <Label>
                Mavzu <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="Dars mavzusi"
                aria-invalid={!!errors.topic}
                {...register("topic", { required: true })}
              />
              {errors.topic && (
                <p className="text-xs text-destructive">Mavzuni kiriting</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Uyga vazifa (sarlavha)</Label>
              <Input
                placeholder="Masalan: 1-2 mashqlar"
                {...register("homeworkTitle")}
              />
            </div>
            <div className="space-y-2">
              <Label>Uyga vazifa (tavsif)</Label>
              <Textarea
                placeholder="Vazifa haqida qisqacha izoh"
                {...register("homeworkDescription")}
              />
            </div>
            <div className="space-y-2">
              <Label>Dars turi</Label>
              <Select {...register("kind")}>
                <option value="main">Asosiy dars</option>
                <option value="extra">Qo&apos;shimcha dars</option>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Bekor qilish
              </Button>
              <Button type="submit" disabled={updateLesson.isPending}>
                Saqlash
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------- 4) Davomat va baholar ----------------------- */

interface RowState {
  status: AttendanceStatus;
  homework: string;
  participation: string;
}

function LessonRosterEditor({
  groupId,
  lessonId,
  onBack,
}: {
  groupId: string;
  lessonId: string;
  onBack: () => void;
}) {
  const { data: group } = useGroup(groupId);
  const { data: roster } = useLessonRoster(lessonId);
  const setAttendance = useSetAttendance();
  const setGrades = useSetGrades();
  const { toast } = useToast();
  const [rows, setRows] = React.useState<Record<string, RowState>>({});

  const students = React.useMemo(
    () =>
      group?.students
        .filter((s) => s.enrollment.status === "active")
        .map((s) => s.user) ?? [],
    [group],
  );

  React.useEffect(() => {
    if (!roster || !students.length) return;
    const next: Record<string, RowState> = {};
    for (const s of students) {
      const att = roster.attendances.find((a) => a.studentId === s.id);
      const hw = roster.grades.find(
        (g) => g.studentId === s.id && g.type === "homework",
      );
      const part = roster.grades.find(
        (g) => g.studentId === s.id && g.type === "participation",
      );
      next[s.id] = {
        status: att?.status ?? "present",
        homework: hw ? String(hw.score) : "",
        participation: part ? String(part.score) : "",
      };
    }
    setRows(next);
  }, [roster, students]);

  const update = (id: string, patch: Partial<RowState>) =>
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const billable = (s: AttendanceStatus) => s === "present" || s === "late";

  const clampScore = (value: string): string => {
    const digits = value.replace(/\D/g, "");
    if (digits === "") return "";
    let n = parseInt(digits, 10);
    if (Number.isNaN(n)) return "";
    if (n > 10) n = 10;
    if (n < 1) n = 1;
    return String(n);
  };

  const counts = React.useMemo(() => {
    const c = { present: 0, late: 0, excused: 0, absent: 0 };
    for (const s of students) {
      const st = rows[s.id]?.status ?? "absent";
      c[st]++;
    }
    return c;
  }, [rows, students]);

  const onSave = async () => {
    try {
      const attItems = students.map((s) => ({
        studentId: s.id,
        status: rows[s.id]?.status ?? "absent",
      }));
      await setAttendance.mutateAsync({ lessonId, items: attItems });

      const gradeItems: { studentId: string; type: string; score: number }[] = [];
      for (const s of students) {
        const r = rows[s.id];
        if (!r || !billable(r.status)) continue;
        const hw = r.homework === "" ? 0 : Number(r.homework);
        const part = r.participation === "" ? 0 : Number(r.participation);
        gradeItems.push({ studentId: s.id, type: "homework", score: hw });
        gradeItems.push({ studentId: s.id, type: "participation", score: part });
      }
      if (gradeItems.length)
        await setGrades.mutateAsync({ lessonId, items: gradeItems });

      toast({ title: "Saqlandi", variant: "success" });
    } catch (err) {
      toast({
        title: "Xatolik",
        description: err instanceof ApiError ? err.message : "Xatolik",
        variant: "error",
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle>Davomat va baholar</CardTitle>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="success">Keldi: {counts.present}</Badge>
          <Badge variant="warning">Kech: {counts.late}</Badge>
          <Badge variant="outline">Sababli: {counts.excused}</Badge>
          <Badge variant="destructive">Kelmadi: {counts.absent}</Badge>
          <Button onClick={onSave} disabled={setAttendance.isPending}>
            Saqlash
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!students.length ? (
          <p className="text-sm text-muted-foreground">Guruhda o'quvchi yo'q.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>T/R</TableHead>
                <TableHead>O'quvchi</TableHead>
                <TableHead>Davomat</TableHead>
                <TableHead>Uy vazifasi (1-10)</TableHead>
                <TableHead>Faollik (1-10)</TableHead>
                <TableHead>Baho</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s, i) => {
                const r = rows[s.id] ?? {
                  status: "present" as AttendanceStatus,
                  homework: "",
                  participation: "",
                };
                const enabled = billable(r.status);
                const hw = Number(r.homework) || 0;
                const part = Number(r.participation) || 0;
                const total = hw + part;
                const letter = enabled && total > 0 ? sumToLetter(total) : "";
                return (
                  <TableRow key={s.id}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{s.fullName}</TableCell>
                    <TableCell>
                      <Select
                        value={r.status}
                        onChange={(e) =>
                          update(s.id, {
                            status: e.target.value as AttendanceStatus,
                          })
                        }
                        className={cn("w-36 font-medium", attSelectColor(r.status))}
                      >
                        {ATT_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        inputMode="numeric"
                        className="w-24"
                        disabled={!enabled}
                        value={enabled ? r.homework : ""}
                        onChange={(e) =>
                          update(s.id, { homework: clampScore(e.target.value) })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        inputMode="numeric"
                        className="w-24"
                        disabled={!enabled}
                        value={enabled ? r.participation : ""}
                        onChange={(e) =>
                          update(s.id, {
                            participation: clampScore(e.target.value),
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {letter ? (
                        <span className={cn("text-lg font-bold", letterColor(letter))}>
                          {letter}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        {roster?.homework && (
          <div className="mt-4 rounded-md border p-3 text-sm">
            <Badge variant="secondary" className="mb-2">
              Uyga vazifa
            </Badge>
            <p className="font-medium">{roster.homework.title}</p>
            {roster.homework.description && (
              <p className="text-muted-foreground">
                {roster.homework.description}
              </p>
            )}
          </div>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          Baho hisobi: uy vazifasi + faollik yig'indisi — 1-9 = P, 10-15 = M, 16-20 = D.
        </p>
      </CardContent>
    </Card>
  );
}

export default function MentorJournalPage() {
  return (
    <Suspense
      fallback={<p className="text-sm text-muted-foreground">Yuklanmoqda...</p>}
    >
      <JournalInner />
    </Suspense>
  );
}
