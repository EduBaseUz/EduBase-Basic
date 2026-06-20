"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { User as UserIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/shared/phone-input";
import { PageHeader } from "@/components/shared/page-header";
import { AvatarUploader } from "@/components/shared/avatar-uploader";
import { useToast } from "@/components/ui/toast";
import { useMe } from "@/hooks/use-auth";
import { useUpdateProfile, useUploadMyAvatar } from "@/hooks/use-users";
import { roleLabels } from "@/lib/auth";
import { onlyDigits } from "@/lib/utils";
import { ApiError } from "@/lib/api";

const schema = z.object({
  lastName: z.string().min(1, "Familiyani kiriting"),
  firstName: z.string().min(1, "Ismni kiriting"),
  middleName: z.string().optional(),
  phone: z.string().regex(/^\d{9}$/, "Telefon raqami to'liq emas"),
  address: z.string().optional(),
  specialization: z.string().optional(),
});

type ProfileForm = z.infer<typeof schema>;

function ReqLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label>
      {children} <span className="text-destructive">*</span>
    </Label>
  );
}

export function ProfileView() {
  const router = useRouter();
  const { data: user } = useMe();
  const update = useUpdateProfile();
  const uploadAvatar = useUploadMyAvatar();
  const { toast } = useToast();

  const onAvatarSelected = async (file: File) => {
    try {
      await uploadAvatar.mutateAsync(file);
      toast({ title: "Rasm yangilandi", variant: "success" });
    } catch (err) {
      toast({
        title: "Xatolik",
        description: err instanceof ApiError ? err.message : "Xatolik",
        variant: "error",
      });
    }
  };

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      lastName: "",
      firstName: "",
      middleName: "",
      phone: "",
      address: "",
      specialization: "",
    },
  });

  React.useEffect(() => {
    if (!user) return;
    // Eski yozuvlarda alohida maydonlar bo'lmasligi mumkin — fullName'dan ajratamiz.
    let last = user.lastName ?? "";
    let first = user.firstName ?? "";
    let middle = user.middleName ?? "";
    if (!last && !first) {
      const parts = (user.fullName ?? "").trim().split(/\s+/);
      last = parts[0] ?? "";
      first = parts[1] ?? "";
      middle = parts.slice(2).join(" ");
    }
    reset({
      lastName: last,
      firstName: first,
      middleName: middle,
      phone: onlyDigits((user.phone ?? "").replace(/^998/, "")),
      address: user.address ?? "",
      specialization: user.specialization ?? "",
    });
  }, [user, reset]);

  if (!user) return null;

  const onSubmit = async (values: ProfileForm) => {
    try {
      const body: Record<string, unknown> = {
        lastName: values.lastName,
        firstName: values.firstName,
        middleName: values.middleName ?? "",
        phone: `998${values.phone}`,
        address: values.address ?? "",
      };
      // Mutaxassislikni faqat admin o'zgartiradi — bu yerda yuborilmaydi.
      await update.mutateAsync(body);
      toast({ title: "Profil yangilandi", variant: "success" });
    } catch (err) {
      toast({
        title: "Xatolik",
        description: err instanceof ApiError ? err.message : "Xatolik",
        variant: "error",
      });
    }
  };

  return (
    <div>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <UserIcon className="h-6 w-6" /> Profil
          </span>
        }
        description="Shaxsiy ma'lumotlaringiz"
      />
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ma'lumotlar</CardTitle>
            <CardDescription>Roli: {roleLabels[user.role]}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 border-b pb-6">
              <AvatarUploader
                currentUrl={user.avatarUrl}
                fullName={user.fullName}
                uploading={uploadAvatar.isPending}
                onFileSelected={onAvatarSelected}
                onError={(message) =>
                  toast({ title: "Xatolik", description: message, variant: "error" })
                }
              />
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
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
                  <p className="text-xs text-destructive">
                    {errors.phone.message}
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

              {user.role === "mentor" && (
                <div className="space-y-2">
                  <Label>Mutaxassisliklar</Label>
                  <div className="flex flex-wrap gap-2">
                    {(user.specializations?.length
                      ? user.specializations
                      : user.specialization
                        ? [user.specialization]
                        : []
                    ).map((sp) => (
                      <span
                        key={sp}
                        className="rounded-md border bg-muted px-3 py-1 text-sm"
                      >
                        {sp}
                      </span>
                    ))}
                    {!user.specializations?.length && !user.specialization && (
                      <span className="text-sm text-muted-foreground">
                        Belgilanmagan
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Mutaxassislikni faqat administrator o'zgartira oladi.
                  </p>
                </div>
              )}

              <Button type="submit" disabled={update.isPending}>
                {update.isPending ? "Saqlanmoqda..." : "Saqlash"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Xavfsizlik</CardTitle>
            <CardDescription>Parolni o'zgartirish</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => router.push("/change-password")}
            >
              Parolni o'zgartirish
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
