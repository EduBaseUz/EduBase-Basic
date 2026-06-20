"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { useToast } from "@/components/ui/toast";
import { useCourse, useUpdateCourse } from "@/hooks/use-courses";
import { ApiError } from "@/lib/api";
import { formatUZS, formatDate, formatThousands, onlyDigits } from "@/lib/utils";
import type { PriceEntry } from "@/types";

const BASE = "/admin/courses";

function ReqLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label>
      {children} <span className="text-destructive">*</span>
    </Label>
  );
}

type Tab = "general" | "prices";

export function CourseSettingsForm({ id }: { id: string }) {
  const { data: course, isLoading } = useCourse(id);
  const [tab, setTab] = React.useState<Tab>("general");

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={course ? `Sozlamalar — ${course.title}` : "Mutaxassislik sozlamalari"}
        description="Davomiyligi, darslar soni va to'lov"
        action={
          <Link
            href={BASE}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ArrowLeft className="h-4 w-4" /> Orqaga
          </Link>
        }
      />

      <div className="mb-6 flex gap-2">
        <Button
          variant={tab === "general" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("general")}
        >
          Umumiy sozlamalar
        </Button>
        <Button
          variant={tab === "prices" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("prices")}
        >
          Oylik narxlar
        </Button>
      </div>

      {isLoading || !course ? (
        <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
      ) : tab === "general" ? (
        <GeneralTab id={id} />
      ) : (
        <PricesTab id={id} initial={course.priceEntries ?? []} />
      )}
    </div>
  );
}

interface GeneralValues {
  durationMonths: number;
  lessonsPerMonth: number;
}

function GeneralTab({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { data: course } = useCourse(id);
  const updateCourse = useUpdateCourse();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GeneralValues>({
    defaultValues: {
      durationMonths: 6,
      lessonsPerMonth: 8,
    },
  });

  React.useEffect(() => {
    if (course) {
      reset({
        durationMonths: course.durationMonths || 0,
        lessonsPerMonth: course.lessonsPerMonth || 0,
      });
    }
  }, [course, reset]);

  const onSubmit = async (values: GeneralValues) => {
    try {
      await updateCourse.mutateAsync({
        id,
        body: {
          durationMonths: Number(values.durationMonths),
          lessonsPerMonth: Number(values.lessonsPerMonth),
        },
      });
      toast({ title: "Sozlamalar saqlandi", variant: "success" });
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Umumiy sozlamalar</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <ReqLabel>Davomiyligi (oy)</ReqLabel>
            <Input
              type="number"
              min={1}
              placeholder="6"
              aria-invalid={!!errors.durationMonths}
              {...register("durationMonths", { required: true, min: 1 })}
            />
          </div>
          <div className="space-y-2">
            <ReqLabel>Oylik darslar soni</ReqLabel>
            <Input
              type="number"
              min={1}
              placeholder="8"
              aria-invalid={!!errors.lessonsPerMonth}
              {...register("lessonsPerMonth", { required: true, min: 1 })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Link href={BASE} className={buttonVariants({ variant: "outline" })}>
              Bekor qilish
            </Link>
            <Button type="submit" disabled={updateCourse.isPending}>
              {updateCourse.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function PricesTab({
  id,
  initial,
}: {
  id: string;
  initial: PriceEntry[];
}) {
  const { toast } = useToast();
  const updateCourse = useUpdateCourse();
  const [entries, setEntries] = React.useState<PriceEntry[]>(initial);
  const [start, setStart] = React.useState("");
  const [end, setEnd] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [rate, setRate] = React.useState("");

  React.useEffect(() => setEntries(initial), [initial]);

  const persist = async (next: PriceEntry[]) => {
    try {
      await updateCourse.mutateAsync({
        id,
        body: {
          priceEntries: next.map((e) => ({
            startDate: e.startDate,
            endDate: e.endDate,
            price: e.price,
            mentorRate: e.mentorRate,
          })),
        },
      });
      setEntries(next);
      toast({ title: "Saqlandi", variant: "success" });
    } catch (err) {
      toast({
        title: "Xatolik",
        description: err instanceof ApiError ? err.message : "Xatolik",
        variant: "error",
      });
    }
  };

  const onAdd = () => {
    if (!start || !end || price === "" || rate === "") {
      toast({ title: "Barcha maydonlarni to'ldiring", variant: "error" });
      return;
    }
    if (end < start) {
      toast({ title: "Tugash sanasi noto'g'ri", variant: "error" });
      return;
    }
    const next = [
      ...entries,
      {
        startDate: start,
        endDate: end,
        price: Number(price),
        mentorRate: Number(rate),
      },
    ];
    persist(next);
    setStart("");
    setEnd("");
    setPrice("");
    setRate("");
  };

  const onRemove = (i: number) => {
    persist(entries.filter((_, idx) => idx !== i));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Oylik narxlar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <ReqLabel>Boshlanish</ReqLabel>
              <Input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <ReqLabel>Tugash</ReqLabel>
              <Input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <ReqLabel>Oylik summa</ReqLabel>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="500 000"
                value={formatThousands(price)}
                onChange={(e) => setPrice(onlyDigits(e.target.value, 12))}
              />
            </div>
            <div className="space-y-1">
              <ReqLabel>1 kishilik to'lov</ReqLabel>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="20 000"
                value={formatThousands(rate)}
                onChange={(e) => setRate(onlyDigits(e.target.value, 12))}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={onAdd} disabled={updateCourse.isPending}>
              <Plus className="h-4 w-4" /> Qo'shish
            </Button>
          </div>
        </div>

        {!entries.length ? (
          <p className="text-sm text-muted-foreground">
            Hozircha narx kiritilmagan.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>T/R</TableHead>
                <TableHead>Boshlanish</TableHead>
                <TableHead>Tugash</TableHead>
                <TableHead>Oylik summa</TableHead>
                <TableHead>1 kishilik to'lov</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e, i) => (
                <TableRow key={i}>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  <TableCell>{formatDate(e.startDate)}</TableCell>
                  <TableCell>{formatDate(e.endDate)}</TableCell>
                  <TableCell>{formatUZS(e.price)}</TableCell>
                  <TableCell>{formatUZS(e.mentorRate)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemove(i)}
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
    </Card>
  );
}
