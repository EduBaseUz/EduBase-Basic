"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { ArrowLeft, ClipboardList, Pencil, Plus, Trash2 } from "lucide-react";
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
import type { AttendanceStatus } from "@/types";

const ATT_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: "present", label: "Keldi" },
  { value: "late", label: "Kech qoldi" },
  { value: "excused", label: "Sababli" },
  { value: "absent", label: "Kelmadi" },
];

const ATT_LABELS: Record<AttendanceStatus, string> = {
  present: "Keldi",
  late: "Kech qoldi",
  excused: "Sababli",
  absent: "Kelmadi",
};

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
  const { data: groups } = useGroups();
  const [groupId, setGroupId] = React.useState<string>("");
  const [lessonId, setLessonId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const q = params.get("group");
    if (q) setGroupId(q);
    else if (!groupId && groups?.items.length) setGroupId(groups.items[0].id);
  }, [params, groups, groupId]);

  return (
    <div>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <ClipboardList className="h-6 w-6" /> Jurnal
          </span>
        }
        description="Darslar, davomat va baholar"
      />

      <div className="mb-6 max-w-xs">
        <Label>Guruh</Label>
        <Select
          value={groupId}
          onChange={(e) => {
            setGroupId(e.target.value);
            setLessonId(null);
          }}
        >
          <option value="">— Tanlang —</option>
          {groups?.items.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </Select>
      </div>

      {groupId && !lessonId && (
        <LessonList groupId={groupId} onOpen={setLessonId} />
      )}
      {groupId && lessonId && (
        <LessonRosterEditor
          groupId={groupId}
          lessonId={lessonId}
          onBack={() => setLessonId(null)}
        />
      )}
    </div>
  );
}

interface LessonFormValues {
  date: string;
  topic: string;
  homeworkTitle: string;
  homeworkDescription: string;
}

function LessonList({
  groupId,
  onOpen,
}: {
  groupId: string;
  onOpen: (id: string) => void;
}) {
  const { data, isLoading } = useLessons(groupId);
  const createLesson = useCreateLesson();
  const deleteLesson = useDeleteLesson();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [toDelete, setToDelete] = React.useState<string | null>(null);
  const [editId, setEditId] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LessonFormValues>();

  const openCreate = () => {
    reset({
      date: new Date().toISOString().slice(0, 10),
      topic: "",
      homeworkTitle: "",
      homeworkDescription: "",
    });
    setOpen(true);
  };

  const onSubmit = handleSubmit(async (v) => {
    try {
      await createLesson.mutateAsync({
        groupId,
        body: {
          date: v.date,
          topic: v.topic,
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
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Darslar</CardTitle>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Yangi dars
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
        ) : !data?.items.length ? (
          <p className="text-sm text-muted-foreground">Hozircha dars yo'q.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>T/R</TableHead>
                <TableHead>Sana</TableHead>
                <TableHead>Mavzu</TableHead>
                <TableHead>Oy</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((l, i) => (
                <TableRow key={l.id}>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  <TableCell>{formatDate(l.date)}</TableCell>
                  <TableCell>{l.topic}</TableCell>
                  <TableCell>{l.monthIndex}-oy</TableCell>
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
                aria-invalid={!!errors.date}
                {...register("date", { required: true })}
              />
              {errors.date && (
                <p className="text-xs text-destructive">Sanani tanlang</p>
              )}
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
        <EditLessonDialog lessonId={editId} onClose={() => setEditId(null)} />
      )}
    </Card>
  );
}

function EditLessonDialog({
  lessonId,
  onClose,
}: {
  lessonId: string;
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
                aria-invalid={!!errors.date}
                {...register("date", { required: true })}
              />
              {errors.date && (
                <p className="text-xs text-destructive">Sanani tanlang</p>
              )}
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

  // Bo'sh qoldirish mumkin; aks holda faqat 1-10 oralig'idagi son qabul qilinadi.
  const clampScore = (value: string): string => {
    const digits = value.replace(/\D/g, "");
    if (digits === "") return "";
    let n = parseInt(digits, 10);
    if (Number.isNaN(n)) return "";
    if (n > 10) n = 10;
    if (n < 1) n = 1;
    return String(n);
  };

  // Davomat statistikasi.
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
        // Bo'sh maydon => score 0 (backend mavjud bahoni o'chiradi).
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
