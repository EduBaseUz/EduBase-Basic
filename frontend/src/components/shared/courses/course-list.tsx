"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { BookOpen, Eye, Pencil, Plus, Settings2, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { useCourses, useDeleteCourse } from "@/hooks/use-courses";
import { ApiError } from "@/lib/api";
import type { Course } from "@/types";

const BASE = "/admin/courses";

export function CourseList() {
  const { data, isLoading } = useCourses();
  const deleteCourse = useDeleteCourse();
  const { toast } = useToast();
  const [toDelete, setToDelete] = React.useState<Course | null>(null);

  const onDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteCourse.mutateAsync(toDelete.id);
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

  const columns: ColumnDef<Course>[] = [
    {
      id: "index",
      header: "T/R",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.index + 1}</span>
      ),
    },
    { accessorKey: "title", header: "Nomi" },
    {
      id: "duration",
      header: "Davomiyligi",
      cell: ({ row }) => `${row.original.durationMonths} oy`,
    },
    { accessorKey: "lessonsPerMonth", header: "Oylik darslar" },
    {
      id: "status",
      header: "Holat",
      cell: ({ row }) =>
        row.original.status === "active" ? (
          <Badge variant="success">Faol</Badge>
        ) : (
          <Badge variant="outline">Arxiv</Badge>
        ),
    },
    {
      id: "actions",
      header: "Amallar",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Link
            href={`${BASE}/${row.original.id}`}
            className={buttonVariants({ variant: "ghost", size: "icon" })}
            title="Ko'rish"
          >
            <Eye className="h-4 w-4" />
          </Link>
          <Link
            href={`${BASE}/${row.original.id}/edit`}
            className={buttonVariants({ variant: "ghost", size: "icon" })}
            title="Tahrirlash"
          >
            <Pencil className="h-4 w-4" />
          </Link>
          <Link
            href={`${BASE}/${row.original.id}/settings`}
            className={buttonVariants({ variant: "ghost", size: "icon" })}
            title="Sozlamalar"
          >
            <Settings2 className="h-4 w-4" />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            title="O'chirish"
            onClick={() => setToDelete(row.original)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <BookOpen className="h-6 w-6" /> Mutaxassisliklar
          </span>
        }
        description="Mutaxassisliklar va narxlarni boshqarish"
        action={
          <Link href={`${BASE}/new`} className={buttonVariants()}>
            <Plus className="h-4 w-4" /> Yangi mutaxassislik
          </Link>
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
      ) : (
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          searchKey="title"
          searchPlaceholder="Nomi bo'yicha qidirish..."
        />
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="O'chirishni tasdiqlang"
        description={
          toDelete
            ? `"${toDelete.title}" mutaxassisligini o'chirmoqchimisiz?`
            : ""
        }
        confirmLabel="O'chirish"
        variant="destructive"
        loading={deleteCourse.isPending}
        onConfirm={onDelete}
      />
    </div>
  );
}
