"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import type { ColumnDef } from "@tanstack/react-table";
import { KeyRound, Pencil, Trash2, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useResetPassword,
} from "@/hooks/use-users";
import { useCourses } from "@/hooks/use-courses";
import { ApiError } from "@/lib/api";
import type { Role, User } from "@/types";

interface UserForm {
  fullName: string;
  phone: string;
  address: string;
  specialization: string;
  noteCourseId: string;
  status: "active" | "inactive";
}

interface UsersManagerProps {
  role: Extract<Role, "mentor" | "student" | "parent">;
  title: string;
  description: string;
  /** Yaratish tugmasidagi matn, masalan "Yangi mentor" */
  createLabel: string;
}

export function UsersManager({
  role,
  title,
  description,
  createLabel,
}: UsersManagerProps) {
  const { data, isLoading } = useUsers({ role });
  const { data: courses } = useCourses();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const resetPw = useResetPassword();
  const { toast } = useToast();

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<User | null>(null);
  const { register, handleSubmit, reset } = useForm<UserForm>({
    defaultValues: { status: "active" },
  });

  const openCreate = () => {
    setEditing(null);
    reset({
      fullName: "",
      phone: "",
      address: "",
      specialization: "",
      noteCourseId: "",
      status: "active",
    });
    setOpen(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    reset({
      fullName: u.fullName,
      phone: u.phone,
      address: u.address ?? "",
      specialization: u.specialization ?? "",
      noteCourseId: u.noteCourseId ?? "",
      status: u.status,
    });
    setOpen(true);
  };

  const onSubmit = async (values: UserForm) => {
    try {
      if (editing) {
        const body: Record<string, unknown> = {
          fullName: values.fullName,
          phone: values.phone,
          address: values.address,
          status: values.status,
        };
        if (role === "mentor") body.specialization = values.specialization;
        if (role === "student") body.noteCourseId = values.noteCourseId || "";
        await updateUser.mutateAsync({ id: editing.id, body });
        toast({ title: "Yangilandi", variant: "success" });
      } else {
        const body: Record<string, unknown> = {
          role,
          fullName: values.fullName,
          phone: values.phone,
          address: values.address,
        };
        if (role === "mentor") body.specialization = values.specialization;
        if (role === "student" && values.noteCourseId)
          body.noteCourseId = values.noteCourseId;
        await createUser.mutateAsync(body);
        toast({
          title: "Qo'shildi",
          description: "Boshlang'ich parol = telefon raqami",
          variant: "success",
        });
      }
      setOpen(false);
    } catch (err) {
      toast({
        title: "Xatolik",
        description: err instanceof ApiError ? err.message : "Xatolik",
        variant: "error",
      });
    }
  };

  const onDelete = async (u: User) => {
    if (!confirm(`${u.fullName} ni o'chirishni tasdiqlaysizmi?`)) return;
    try {
      await deleteUser.mutateAsync(u.id);
      toast({ title: "O'chirildi", variant: "success" });
    } catch (err) {
      toast({
        title: "Xatolik",
        description: err instanceof ApiError ? err.message : "Xatolik",
        variant: "error",
      });
    }
  };

  const onReset = async (u: User) => {
    if (!confirm(`${u.fullName} parolini tiklash (parol = telefon)?`)) return;
    try {
      await resetPw.mutateAsync(u.id);
      toast({ title: "Parol tiklandi", variant: "success" });
    } catch (err) {
      toast({
        title: "Xatolik",
        description: err instanceof ApiError ? err.message : "Xatolik",
        variant: "error",
      });
    }
  };

  const columns: ColumnDef<User>[] = [
    { accessorKey: "fullName", header: "F.I.O." },
    { accessorKey: "phone", header: "Telefon" },
    ...(role === "mentor"
      ? [
          {
            id: "spec",
            header: "Mutaxassislik",
            cell: ({ row }: { row: { original: User } }) =>
              row.original.specialization || "—",
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
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onReset(row.original)}>
            <KeyRound className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(row.original)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> {createLabel}
          </Button>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle>{editing ? "Tahrirlash" : createLabel}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>F.I.O.</Label>
              <Input {...register("fullName", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>Telefon raqami</Label>
              <Input
                placeholder="998901234567"
                {...register("phone", { required: true })}
              />
              {!editing && (
                <p className="text-xs text-muted-foreground">
                  Boshlang'ich parol shu telefon raqami bo'ladi.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Manzil</Label>
              <Input {...register("address")} />
            </div>
            {role === "mentor" && (
              <div className="space-y-2">
                <Label>Mutaxassislik</Label>
                <Input {...register("specialization")} />
              </div>
            )}
            {role === "student" && (
              <div className="space-y-2">
                <Label>Yo'nalish (kurs belgisi)</Label>
                <Select {...register("noteCourseId")}>
                  <option value="">— Tanlanmagan —</option>
                  {courses?.items.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            {editing && (
              <div className="space-y-2">
                <Label>Holat</Label>
                <Select {...register("status")}>
                  <option value="active">Faol</option>
                  <option value="inactive">Nofaol</option>
                </Select>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Bekor qilish
              </Button>
              <Button type="submit">Saqlash</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
