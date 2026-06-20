"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { PhoneInput } from "@/components/shared/phone-input";
import { AvatarUploader } from "@/components/shared/avatar-uploader";
import { useToast } from "@/components/ui/toast";
import {
  useCreateUser,
  useUpdateUser,
  useUploadUserAvatar,
  useUser,
} from "@/hooks/use-users";
import { useCourses } from "@/hooks/use-courses";
import { ApiError } from "@/lib/api";
import { onlyDigits } from "@/lib/utils";
import { roleMeta, type ManagedRole } from "@/components/shared/users/role-config";

const baseSchema = z.object({
  lastName: z.string().min(1, "Familiyani kiriting"),
  firstName: z.string().min(1, "Ismni kiriting"),
  middleName: z.string().optional(),
  gender: z.enum(["male", "female"], { message: "Jinsni tanlang" }),
  phone: z.string().regex(/^\d{9}$/, "Telefon raqami to'liq emas"),
  address: z.string().optional(),
  specialization: z.string().optional(),
  birthDate: z.string().optional(),
  documentType: z.string().optional(),
  documentSeries: z.string().optional(),
  documentNumber: z.string().optional(),
});

type FormValues = z.infer<typeof baseSchema>;

/** "* majburiy" belgisi bilan label. */
function ReqLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label>
      {children} <span className="text-destructive">*</span>
    </Label>
  );
}

interface UserFormProps {
  role: ManagedRole;
  mode: "create" | "edit";
  id?: string;
}

export function UserForm({ role, mode, id }: UserFormProps) {
  const meta = roleMeta[role];
  const router = useRouter();
  const { toast } = useToast();
  const { data: courses } = useCourses();
  const { data: existing } = useUser(mode === "edit" ? id : undefined);
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const uploadAvatar = useUploadUserAvatar();

  // Mentor bir nechta mutaxassislikka ega bo'lishi mumkin.
  const [specs, setSpecs] = React.useState<string[]>([]);
  const [specError, setSpecError] = React.useState(false);
  // Tanlangan avatar fayli (yaratishda — user yaratilgach yuklanadi).
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(baseSchema),
    defaultValues: {
      lastName: "",
      firstName: "",
      middleName: "",
      gender: undefined,
      phone: "",
      address: "",
      specialization: "",
      birthDate: "",
      documentType: undefined,
      documentSeries: "",
      documentNumber: "",
    },
  });

  // Tahrirlashda mavjud ma'lumotlarni to'ldiramiz.
  React.useEffect(() => {
    if (mode === "edit" && existing) {
      // Eski yozuvlarda alohida maydonlar bo'lmasligi mumkin — fullName'dan ajratamiz.
      let last = existing.lastName ?? "";
      let first = existing.firstName ?? "";
      let middle = existing.middleName ?? "";
      if (!last && !first) {
        const parts = (existing.fullName ?? "").trim().split(/\s+/);
        last = parts[0] ?? "";
        first = parts[1] ?? "";
        middle = parts.slice(2).join(" ");
      }
      reset({
        lastName: last,
        firstName: first,
        middleName: middle,
        gender: existing.gender,
        phone: onlyDigits((existing.phone ?? "").replace(/^998/, "")),
        address: existing.address ?? "",
        specialization: existing.specialization ?? "",
        birthDate: existing.birthDate ?? "",
        documentType: existing.documentType,
        documentSeries: existing.documentSeries ?? "",
        documentNumber: existing.documentNumber ?? "",
      });
      const existingSpecs =
        existing.specializations && existing.specializations.length
          ? existing.specializations
          : existing.specialization
            ? [existing.specialization]
            : [];
      setSpecs(existingSpecs);
    }
  }, [mode, existing, reset]);

  const toggleSpec = (title: string) =>
    setSpecs((prev) =>
      prev.includes(title) ? prev.filter((x) => x !== title) : [...prev, title],
    );

  const onSubmit = async (values: FormValues) => {
    if (role === "mentor" && specs.length === 0) {
      setSpecError(true);
      return;
    }
    const body: Record<string, unknown> = {
      lastName: values.lastName,
      firstName: values.firstName,
      middleName: values.middleName ?? "",
      gender: values.gender,
      phone: `998${values.phone}`,
      address: values.address ?? "",
    };
    if (role === "mentor") body.specializations = specs;
    if (role === "student") {
      body.birthDate = values.birthDate ?? "";
      body.documentType = values.documentType ?? "";
      body.documentSeries = values.documentSeries ?? "";
      body.documentNumber = values.documentNumber ?? "";
    }

    try {
      if (mode === "create") {
        const created = await createUser.mutateAsync({ role, ...body });
        if (avatarFile && created?.id) {
          await uploadAvatar.mutateAsync({ id: created.id, file: avatarFile });
        }
        toast({
          title: "Qo'shildi",
          description: "Boshlang'ich parol = telefon raqami",
          variant: "success",
        });
      } else if (id) {
        await updateUser.mutateAsync({ id, body });
        if (avatarFile) {
          await uploadAvatar.mutateAsync({ id, file: avatarFile });
        }
        toast({ title: "Yangilandi", variant: "success" });
      }
      router.push(meta.basePath);
      router.refresh();
    } catch (err) {
      toast({
        title: "Xatolik",
        description: err instanceof ApiError ? err.message : "Xatolik",
        variant: "error",
      });
    }
  };

  const pending =
    createUser.isPending || updateUser.isPending || uploadAvatar.isPending;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="relative mb-6 flex h-9 items-center justify-center">
        <Link
          href={meta.basePath}
          className={buttonVariants({
            variant: "outline",
            size: "sm",
            className: "absolute left-0",
          })}
        >
          <ArrowLeft className="h-4 w-4" /> Orqaga
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">
          {mode === "create" ? meta.createLabel : `${meta.singular}ni tahrirlash`}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ma'lumotlar</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-2 border-b pb-4">
              <Label>Avatar rasmi</Label>
              <AvatarUploader
                currentUrl={mode === "edit" ? existing?.avatarUrl : undefined}
                fullName={existing?.fullName}
                onFileSelected={setAvatarFile}
                onError={(message) =>
                  toast({ title: "Xatolik", description: message, variant: "error" })
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <ReqLabel>Familiya</ReqLabel>
                <Input
                  placeholder="Masalan: Karimov"
                  aria-invalid={!!errors.lastName}
                  {...register("lastName")}
                />
                {errors.lastName && (
                  <p className="text-xs text-destructive">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <ReqLabel>Ism</ReqLabel>
                <Input
                  placeholder="Masalan: Akmal"
                  aria-invalid={!!errors.firstName}
                  {...register("firstName")}
                />
                {errors.firstName && (
                  <p className="text-xs text-destructive">
                    {errors.firstName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Sharif</Label>
                <Input
                  placeholder="Masalan: Akmalovich"
                  {...register("middleName")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <ReqLabel>Jinsi</ReqLabel>
              <Select aria-invalid={!!errors.gender} {...register("gender")}>
                <option value="">— Tanlang —</option>
                <option value="male">Erkak</option>
                <option value="female">Ayol</option>
              </Select>
              {errors.gender && (
                <p className="text-xs text-destructive">
                  {errors.gender.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <ReqLabel>Telefon raqami</ReqLabel>
              <Controller
                control={control}
                name="phone"
                render={({ field }) => (
                  <PhoneInput
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    invalid={!!errors.phone}
                  />
                )}
              />
              {errors.phone && (
                <p className="text-xs text-destructive">{errors.phone.message}</p>
              )}
              {mode === "create" && (
                <p className="text-xs text-muted-foreground">
                  Boshlang'ich parol shu telefon raqami bo'ladi.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Manzil</Label>
              <Input
                placeholder="Masalan: Toshkent, Chilonzor"
                {...register("address")}
              />
            </div>

            {role === "student" && (
              <>
                <div className="space-y-2">
                  <Label>Tug'ilgan sana</Label>
                  <Input type="date" {...register("birthDate")} />
                </div>
                <div className="space-y-2">
                  <Label>Hujjat turi</Label>
                  <Select {...register("documentType")}>
                    <option value="">— Tanlang —</option>
                    <option value="passport">Passport</option>
                    <option value="birth_certificate">
                      Tug'ilganlik guvohnomasi
                    </option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Hujjat seriyasi va raqami</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Seriya (AA)"
                      className="w-28 uppercase"
                      {...register("documentSeries")}
                    />
                    <span className="text-muted-foreground">—</span>
                    <Input
                      placeholder="Raqam (1234567)"
                      className="flex-1"
                      {...register("documentNumber")}
                    />
                  </div>
                </div>
              </>
            )}

            {role === "mentor" && (
              <div className="space-y-2">
                <ReqLabel>Mutaxassisliklar</ReqLabel>
                <div className="flex flex-wrap gap-2">
                  {courses?.items.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        toggleSpec(c.title);
                        setSpecError(false);
                      }}
                      className={`rounded-md border px-3 py-1 text-sm transition-colors ${
                        specs.includes(c.title)
                          ? "bg-primary text-primary-foreground"
                          : "bg-background"
                      }`}
                    >
                      {c.title}
                    </button>
                  ))}
                  {!courses?.items.length && (
                    <span className="text-sm text-muted-foreground">
                      Avval mutaxassislik (kurs) qo'shing
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Bir nechta mutaxassislik tanlash mumkin.
                </p>
                {specError && (
                  <p className="text-xs text-destructive">
                    Kamida bitta mutaxassislik tanlang
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Link
                href={meta.basePath}
                className={buttonVariants({ variant: "outline" })}
              >
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
