"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Boxes, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { useGroups, useDeleteGroup } from "@/hooks/use-groups";
import { useCourses } from "@/hooks/use-courses";
import { formatDate } from "@/lib/utils";
import { ApiError } from "@/lib/api";
import { GROUP_BASE, dayLabels } from "@/components/shared/groups/group-config";
import type { Group } from "@/types";

export function GroupList() {
  const { data, isLoading } = useGroups();
  const { data: courses } = useCourses();
  const deleteGroup = useDeleteGroup();
  const { toast } = useToast();
  const [toDelete, setToDelete] = React.useState<Group | null>(null);

  const courseName = (id: string) =>
    courses?.items.find((c) => c.id === id)?.title ?? "—";

  const onDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteGroup.mutateAsync(toDelete.id);
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

  const columns: ColumnDef<Group>[] = [
    {
      id: "index",
      header: "T/R",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.index + 1}</span>
      ),
    },
    { accessorKey: "name", header: "Nomi" },
    {
      id: "course",
      header: "Mutaxassislik",
      cell: ({ row }) => courseName(row.original.courseId),
    },
    {
      id: "schedule",
      header: "Jadval",
      cell: ({ row }) => {
        const s = row.original.schedule;
        return `${dayLabels(s.days)} ${s.startTime}-${s.endTime}`;
      },
    },
    {
      id: "start",
      header: "Boshlanish",
      cell: ({ row }) => formatDate(row.original.startDate),
    },
    {
      id: "status",
      header: "Holat",
      cell: ({ row }) => (
        <Badge variant={row.original.status === "active" ? "success" : "outline"}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Amallar",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Link
            href={`${GROUP_BASE}/${row.original.id}`}
            className={buttonVariants({ variant: "ghost", size: "icon" })}
            title="Ko'rish / Boshqarish"
          >
            <Eye className="h-4 w-4" />
          </Link>
          <Link
            href={`${GROUP_BASE}/${row.original.id}/edit`}
            className={buttonVariants({ variant: "ghost", size: "icon" })}
            title="Tahrirlash"
          >
            <Pencil className="h-4 w-4" />
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
            <Boxes className="h-6 w-6" /> Guruhlar
          </span>
        }
        description="Guruhlar, mentorlar va o'quvchilarni boshqarish"
        action={
          <Link href={`${GROUP_BASE}/new`} className={buttonVariants()}>
            <Plus className="h-4 w-4" /> Yangi guruh
          </Link>
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
      ) : (
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          searchKey="name"
          searchPlaceholder="Guruh nomi bo'yicha qidirish..."
        />
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="O'chirishni tasdiqlang"
        description={
          toDelete ? `"${toDelete.name}" guruhini o'chirmoqchimisiz?` : ""
        }
        confirmLabel="O'chirish"
        variant="destructive"
        loading={deleteGroup.isPending}
        onConfirm={onDelete}
      />
    </div>
  );
}
