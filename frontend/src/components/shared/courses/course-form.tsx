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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CourseFormValues>({
    defaultValues: { title: "", description: "" },
  });

  React.useEffect(() => {
    if (mode === "edit" && existing) {
      reset({
        title: existing.title,
        description: existing.description ?? "",
      });
    }
  }, [mode, existing, reset]);

  const onSubmit = async (values: CourseFormValues) => {
    try {
      if (mode === "create") {
        await createCourse.mutateAsync({
          title: values.title,
          description: values.description,
        });
        toast({
          title: "Mutaxassislik qo'shildi",
          description: "Sozlamalarda davomiyligi va to'lovni kiriting",
          variant: "success",
        });
      } else if (id) {
        await updateCourse.mutateAsync({
          id,
          body: { title: values.title, description: values.description },
        });
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
              <ReqLabel>Mutaxassislik nomi</ReqLabel>
              <Input
                placeholder="Masalan: Frontend dasturlash"
                aria-invalid={!!errors.title}
                {...register("title", { required: true })}
              />
              {errors.title && (
                <p className="text-xs text-destructive">Nomni kiriting</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Mutaxassislik tasnifi</Label>
              <Textarea
                placeholder="Mutaxassislik haqida qisqacha"
                {...register("description")}
              />
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
