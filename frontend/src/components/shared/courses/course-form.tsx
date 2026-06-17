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
import { Textarea } from "@/components/ui/textarea";
import { Button, buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { useToast } from "@/components/ui/toast";
import {
  useCourse,
  useCreateCourse,
  useUpdateCourse,
} from "@/hooks/use-courses";
import { ApiError } from "@/lib/api";

const BASE = "/admin/courses";

interface CourseFormValues {
  title: string;
  description: string;
  durationMonths: number;
  lessonsPerMonth: number;
  mentorRatePerStudent: number;
}

function ReqLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label>
      {children} <span className="text-destructive">*</span>
    </Label>
  );
}

export function CourseForm({
  mode,
  id,
}: {
  mode: "create" | "edit";
  id?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { data: existing } = useCourse(mode === "edit" ? id : undefined);
  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse();

  const [prices, setPrices] = React.useState<number[]>(Array(6).fill(0));
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CourseFormValues>({
    defaultValues: {
      title: "",
      description: "",
      durationMonths: 6,
      lessonsPerMonth: 8,
      mentorRatePerStudent: 20000,
    },
  });
  const duration = Number(watch("durationMonths")) || 0;

  React.useEffect(() => {
    setPrices((prev) => {
      const next = [...prev];
      if (duration > next.length) {
        const fill = next[next.length - 1] ?? 0;
        while (next.length < duration) next.push(fill);
      } else {
        next.length = duration;
      }
      return next;
    });
  }, [duration]);

  React.useEffect(() => {
    if (mode === "edit" && existing) {
      reset({
        title: existing.title,
        description: existing.description ?? "",
        durationMonths: existing.durationMonths,
        lessonsPerMonth: existing.lessonsPerMonth,
        mentorRatePerStudent: existing.mentorRatePerStudent,
      });
      const arr = Array(existing.durationMonths).fill(0);
      existing.monthlyPrices.forEach((mp) => {
        if (mp.monthIndex >= 1 && mp.monthIndex <= arr.length)
          arr[mp.monthIndex - 1] = mp.price;
      });
      setPrices(arr);
    }
  }, [mode, existing, reset]);

  const onSubmit = async (values: CourseFormValues) => {
    const body: Record<string, unknown> = {
      title: values.title,
      description: values.description,
      durationMonths: Number(values.durationMonths),
      lessonsPerMonth: Number(values.lessonsPerMonth),
      mentorRatePerStudent: Number(values.mentorRatePerStudent),
      monthlyPrices: prices.map((price, i) => ({
        monthIndex: i + 1,
        price: Number(price) || 0,
      })),
    };
    try {
      if (mode === "create") {
        await createCourse.mutateAsync(body);
        toast({ title: "Qo'shildi", variant: "success" });
      } else if (id) {
        await updateCourse.mutateAsync({ id, body });
        toast({ title: "Yangilandi", variant: "success" });
      }
      router.push(BASE);
      router.refresh();
    } catch (err) {
      toast({
        title: "Xatolik",
        description: err instanceof ApiError ? err.message : "Xatolik",
        variant: "error",
      });
    }
  };

  const pending = createCourse.isPending || updateCourse.isPending;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={
          mode === "create" ? "Yangi mutaxassislik" : "Mutaxassislikni tahrirlash"
        }
        action={
          <Link
            href={BASE}
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
            <div className="space-y-2">
              <ReqLabel>Nomi</ReqLabel>
              <Input
                placeholder="Masalan: Frontend dasturlash"
                aria-invalid={!!errors.title}
                {...register("title", { required: true })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tavsif</Label>
              <Textarea
                placeholder="Mutaxassislik haqida qisqacha"
                {...register("description")}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <ReqLabel>Davomiyligi (oy)</ReqLabel>
                <Input
                  type="number"
                  min={1}
                  placeholder="6"
                  {...register("durationMonths", { required: true })}
                />
              </div>
              <div className="space-y-2">
                <ReqLabel>Oylik darslar</ReqLabel>
                <Input
                  type="number"
                  min={1}
                  placeholder="8"
                  {...register("lessonsPerMonth", { required: true })}
                />
              </div>
              <div className="space-y-2">
                <ReqLabel>1 kishilik to'lov</ReqLabel>
                <Input
                  type="number"
                  min={0}
                  placeholder="20000"
                  {...register("mentorRatePerStudent", { required: true })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Oylik narxlar (so'm)</Label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {prices.map((price, i) => (
                  <div key={i} className="space-y-1">
                    <span className="text-xs text-muted-foreground">
                      {i + 1}-oy
                    </span>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={price}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setPrices((prev) => {
                          const next = [...prev];
                          next[i] = v;
                          return next;
                        });
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Link href={BASE} className={buttonVariants({ variant: "outline" })}>
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
