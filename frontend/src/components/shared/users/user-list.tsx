"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, Plus, Trash2, Users as UsersIcon, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import {
  useUsers,
  useDeleteUser,
  useAssignParent,
  useSetChildren,
} from "@/hooks/use-users";
import { UserAvatar } from "@/components/shared/user-avatar";
import { ApiError } from "@/lib/api";
import { formatPhoneDisplay } from "@/lib/utils";
import { roleMeta, type ManagedRole } from "@/components/shared/users/role-config";
import type { User } from "@/types";

export function UserList({ role }: { role: ManagedRole }) {
  const meta = roleMeta[role];
  const Icon = meta.icon;
  // "mentor" -> "Mentor", "talaba" -> "Talaba", "ota-ona" -> "Ota-ona"
  const roleTitle = meta.singular.charAt(0).toUpperCase() + meta.singular.slice(1);
  const { data, isLoading } = useUsers({ role });
  const deleteUser = useDeleteUser();
  const { toast } = useToast();

  const [toDelete, setToDelete] = React.useState<User | null>(null);
  const [assignParentFor, setAssignParentFor] = React.useState<User | null>(null);
  const [assignChildrenFor, setAssignChildrenFor] = React.useState<User | null>(null);

  const onDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteUser.mutateAsync(toDelete.id);
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

  const columns: ColumnDef<User>[] = [
    {
      id: "index",
      header: "T/R",
      cell: ({ row }) => <span className="text-muted-foreground">{row.index + 1}</span>,
    },
    {
      accessorKey: "fullName",
      header: roleTitle,
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div className="flex items-center gap-3">
            <UserAvatar user={u} />
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">
                {u.fullName}
              </p>
              <p className="text-xs text-muted-foreground">{roleTitle}</p>
            </div>
          </div>
        );
      },
    },
    {
      id: "phone",
      header: "Telefon",
      cell: ({ row }) => formatPhoneDisplay(row.original.phone),
    },
    ...(role === "mentor"
      ? [
          {
            id: "spec",
            header: "Mutaxassisliklar",
            cell: ({ row }: { row: { original: User } }) => {
              const specs =
                row.original.specializations?.length
                  ? row.original.specializations
                  : row.original.specialization
                    ? [row.original.specialization]
                    : [];
              return specs.length ? specs.join(", ") : "—";
            },
          } as ColumnDef<User>,
        ]
      : []),
    {
      accessorKey: "status",
      header: "Holat",
      cell: ({ row }) =>
        row.original.status === "active" ? (
          <Badge variant="success">Faol</Badge>
        ) : (
          <Badge variant="outline">Nofaol</Badge>
        ),
    },
    {
      id: "actions",
      header: "Amallar",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Link
            href={`${meta.basePath}/${row.original.id}`}
            className={buttonVariants({ variant: "ghost", size: "icon" })}
            title="Ko'rish"
          >
            <Eye className="h-4 w-4" />
          </Link>
          <Link
            href={`${meta.basePath}/${row.original.id}/edit`}
            className={buttonVariants({ variant: "ghost", size: "icon" })}
            title="Tahrirlash"
          >
            <Pencil className="h-4 w-4" />
          </Link>
          {role === "student" && (
            <Button
              variant="ghost"
              size="icon"
              title="Ota-ona biriktirish"
              onClick={() => setAssignParentFor(row.original)}
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          )}
          {role === "parent" && (
            <Button
              variant="ghost"
              size="icon"
              title="Farzand biriktirish"
              onClick={() => setAssignChildrenFor(row.original)}
            >
              <UsersIcon className="h-4 w-4" />
            </Button>
          )}
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
            <Icon className="h-6 w-6" /> {meta.plural}
          </span>
        }
        description={`${meta.plural}ni boshqarish`}
        action={
          <Link href={`${meta.basePath}/new`} className={buttonVariants()}>
            <Plus className="h-4 w-4" /> {meta.createLabel}
          </Link>
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
      ) : (
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          searchKey="fullName"
          searchPlaceholder="Ism yoki telefon bo'yicha qidirish..."
        />
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="O'chirishni tasdiqlang"
        description={
          toDelete
            ? `${toDelete.fullName} ni o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.`
            : ""
        }
        confirmLabel="O'chirish"
        variant="destructive"
        loading={deleteUser.isPending}
        onConfirm={onDelete}
      />

      {assignParentFor && (
        <AssignParentModal
          student={assignParentFor}
          onClose={() => setAssignParentFor(null)}
        />
      )}
      {assignChildrenFor && (
        <AssignChildrenModal
          parent={assignChildrenFor}
          onClose={() => setAssignChildrenFor(null)}
        />
      )}
    </div>
  );
}

function AssignParentModal({
  student,
  onClose,
}: {
  student: User;
  onClose: () => void;
}) {
  const { data: parents } = useUsers({ role: "parent" });
  const assign = useAssignParent();
  const { toast } = useToast();
  const [parentId, setParentId] = React.useState(student.parentId ?? "");

  const onSave = async () => {
    try {
      await assign.mutateAsync({ id: student.id, parentId });
      toast({ title: "Ota-ona biriktirildi", variant: "success" });
      onClose();
    } catch (err) {
      toast({
        title: "Xatolik",
        description: err instanceof ApiError ? err.message : "Xatolik",
        variant: "error",
      });
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle>Ota-ona biriktirish — {student.fullName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Ota-ona</Label>
          <Select value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">— Biriktirilmagan —</option>
            {parents?.items.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName} ({formatPhoneDisplay(p.phone)})
              </option>
            ))}
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button onClick={onSave} disabled={assign.isPending}>
            Saqlash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignChildrenModal({
  parent,
  onClose,
}: {
  parent: User;
  onClose: () => void;
}) {
  const { data: students } = useUsers({ role: "student" });
  const setChildren = useSetChildren();
  const { toast } = useToast();
  const [selected, setSelected] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (students) {
      setSelected(
        students.items.filter((s) => s.parentId === parent.id).map((s) => s.id),
      );
    }
  }, [students, parent.id]);

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const onSave = async () => {
    try {
      await setChildren.mutateAsync({ id: parent.id, studentIds: selected });
      toast({ title: "Farzandlar saqlandi", variant: "success" });
      onClose();
    } catch (err) {
      toast({
        title: "Xatolik",
        description: err instanceof ApiError ? err.message : "Xatolik",
        variant: "error",
      });
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent onClose={onClose} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Farzand biriktirish — {parent.fullName}</DialogTitle>
        </DialogHeader>
        <div className="max-h-72 space-y-1 overflow-y-auto">
          {students?.items.map((s) => {
            const checked = selected.includes(s.id);
            const takenByOther = s.parentId && s.parentId !== parent.id;
            return (
              <label
                key={s.id}
                className="flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(s.id)}
                  className="h-4 w-4"
                />
                <span className="flex-1">
                  {s.fullName}{" "}
                  <span className="text-muted-foreground">
                    {formatPhoneDisplay(s.phone)}
                  </span>
                </span>
                {takenByOther && !checked && (
                  <Badge variant="outline">Boshqa ota-onada</Badge>
                )}
              </label>
            );
          })}
          {!students?.items.length && (
            <p className="text-sm text-muted-foreground">Talabalar yo'q.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button onClick={onSave} disabled={setChildren.isPending}>
            Saqlash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
