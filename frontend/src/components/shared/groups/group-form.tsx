"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button, buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { useToast } from "@/components/ui/toast";
import {
  useGroup,
  useCreateGroup,
  useUpdateGroup,
} from "@/hooks/use-groups";
import { useCourses } from "@/hooks/use-courses";
import { ApiError } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { GROUP_BASE, DAYS } from "@/components/shared/groups/group-config";

interface GroupFormValues {
  name: string;
  courseId: string;
  studentLimit: number;
  startTime: string;
  endTime: string;
  room: string;
  startDate: string;
  status: "active" | "finished" | "paused";
}

function ReqLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label>
      {children} <span className="text-destructive">*</span>
    </Label>
  );
}

/** Sanaga oylar qo'shadi (YYYY-MM-DD). */
function addMonths(dateStr: string, months: number): string {
  if (!dateStr || !months) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function GroupForm({
  mode,
  id,
}: {
  mode: "create" | "edit";
  id?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { data: courses } = useCourses();
  const { data: detail } = useGroup(mode === "edit" ? id : undefined);
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();

  const [days, setDays] = React.useState<string[]>(["mon", "wed", "fri"]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<GroupFormValues>({
    defaultValues: {
      name: "",
      courseId: "",
      studentLimit: 15,
      startTime: "18:00",
      endTime: "20:00",
      room: "",
      startDate: new Date().toISOString().slice(0, 10),
      status: "active",
    },
  });

  React.useEffect(() => {
    if (mode === "edit" && detail) {
      const g = detail.group;
      reset({
        name: g.name,
        courseId: g.courseId,
        studentLimit: g.studentLimit,
        startTime: g.schedule.startTime,
        endTime: g.schedule.endTime,
        room: g.schedule.room ?? "",
        startDate: g.startDate.slice(0, 10),
        status: g.status,
      });
      setDays(g.schedule.days);
    }
  }, [mode, detail, reset]);

  const toggleDay = (d: string) =>
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );

  // Tanlangan mutaxassislik davomiyligiga qarab tugash sanasini hisoblaymiz.
  const watchedCourseId = watch("courseId");
  const watchedStartDate = watch("startDate");
  const selectedCourse = courses?.items.find((c) => c.id === watchedCourseId);
  const durationMonths = selectedCourse?.durationMonths ?? 0;
  const computedEnd = addMonths(watchedStartDate, durationMonths);

  const onSubmit = async (values: GroupFormValues) => {
    if (days.length === 0) {
      toast({ title: "Dars kunlarini tanlang", variant: "error" });
      return;
    }
    const schedule = {
      days,
      startTime: values.startTime,
      endTime: values.endTime,
      room: values.room,
    };
    try {
      if (mode === "create") {
        await createGroup.mutateAsync({
          name: values.name,
          courseId: values.courseId,
          mentorIds: [], // mentorlar alohida — guruh sahifasida biriktiriladi
          studentLimit: Number(values.studentLimit),
          startDate: values.startDate,
          schedule,
        });
        toast({ title: "Guruh yaratildi", variant: "success" });
      } else if (id) {
        await updateGroup.mutateAsync({
          id,
          body: {
            name: values.name,
            studentLimit: Number(values.studentLimit),
            startDate: values.startDate,
            status: values.status,
            schedule,
          },
        });
        toast({ title: "Yangilandi", variant: "success" });
      }
      router.push(mode === "create" ? GROUP_BASE : `${GROUP_BASE}/${id}`);
      router.refresh();
    } catch (err) {
      toast({
        title: "Xatolik",
        description: err instanceof ApiError ? err.message : "Xatolik",
        variant: "error",
      });
    }
  };

  const pending = createGroup.isPending || updateGroup.isPending;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={mode === "create" ? "Yangi guruh" : "Guruhni tahrirlash"}
        action={
          <Link
            href={GROUP_BASE}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ArrowLeft className="h-4 w-4" /> Orqaga
          </Link>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Ma'lumotlar</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <ReqLabel>Nomi</ReqLabel>
                <Input
                  placeholder="Masalan: Frontend-01"
                  aria-invalid={!!errors.name}
                  {...register("name", { required: true })}
                />
              </div>
              <div className="space-y-2">
                <ReqLabel>Mutaxassislik</ReqLabel>
                <Select
                  disabled={mode === "edit"}
                  {...register("courseId", { required: true })}
                >
                  <option value="">— Tanlang —</option>
                  {courses?.items.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </Select>
                {mode === "edit" && (
                  <p className="text-xs text-muted-foreground">
                    Mutaxassislikni yaratilgandan keyin o'zgartirib bo'lmaydi.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <ReqLabel>Dars kunlari</ReqLabel>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => toggleDay(d.key)}
                    className={`h-9 w-10 rounded-md border text-sm ${
                      days.includes(d.key)
                        ? "bg-primary text-primary-foreground"
                        : "bg-background"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="space-y-2">
                <ReqLabel>Boshlanish</ReqLabel>
                <Input type="time" {...register("startTime", { required: true })} />
              </div>
              <div className="space-y-2">
                <ReqLabel>Tugash</ReqLabel>
                <Input type="time" {...register("endTime", { required: true })} />
              </div>
              <div className="space-y-2">
                <Label>Xona</Label>
                <Input placeholder="A1" {...register("room")} />
              </div>
              <div className="space-y-2">
                <ReqLabel>Limit</ReqLabel>
                <Input
                  type="number"
                  min={1}
                  placeholder="15"
                  {...register("studentLimit", { required: true })}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <ReqLabel>Boshlanish sanasi</ReqLabel>
                <Input type="date" {...register("startDate", { required: true })} />
              </div>
              <div className="space-y-2">
                <Label>Tugash sanasi (taxminiy)</Label>
                <Input
                  readOnly
                  value={
                    computedEnd
                      ? `${formatDate(computedEnd)} (${durationMonths} oy)`
                      : "Mutaxassislik va sanani tanlang"
                  }
                  className="bg-muted text-muted-foreground"
                />
              </div>
            </div>

            {mode === "edit" && (
              <div className="space-y-2">
                <Label>Holat</Label>
                <Select {...register("status")}>
                  <option value="active">Faol</option>
                  <option value="paused">To'xtatilgan</option>
                  <option value="finished">Tugagan</option>
                </Select>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Link href={GROUP_BASE} className={buttonVariants({ variant: "outline" })}>
                Bekor qilish
              </Link>
              <Button type="submit" disabled={pending}>
                {pending ? "Saqlanmoqda..." : "Saqlash"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
