"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound } from "lucide-react";
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
import { useChangePassword, useMe } from "@/hooks/use-auth";
import { homeForRole } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

const schema = z
  .object({
    currentPassword: z.string().optional(),
    newPassword: z
      .string()
      .min(8, "Kamida 8 ta belgi")
      .regex(/[A-Z]/, "Kamida 1 ta katta harf")
      .regex(/[a-z]/, "Kamida 1 ta kichik harf"),
    confirmPassword: z.string().min(1, "Parolni tasdiqlang"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Parollar mos kelmadi",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

/** Parol inputi: ko'rsatish/yashirish tugmasi va qizil error holati bilan. */
function PasswordField({
  id,
  label,
  invalid,
  registration,
}: {
  id: string;
  label: string;
  invalid: boolean;
  registration: ReturnType<ReturnType<typeof useForm<FormValues>>["register"]>;
}) {
  const [show, setShow] = React.useState(false);
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          aria-invalid={invalid}
          className="pr-10"
          {...registration}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Parolni yashirish" : "Parolni ko'rsatish"}
          className="absolute right-0 top-0 flex h-9 w-10 items-center justify-center text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export default function ChangePasswordPage() {
  const router = useRouter();
  const { data: user } = useMe();
  const change = useChangePassword();
  const { toast } = useToast();

  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  const mustChange = user?.mustChangePassword ?? true;

  const onSubmit = async (values: FormValues) => {
    try {
      await change.mutateAsync({
        currentPassword: values.currentPassword ?? "",
        newPassword: values.newPassword,
      });
      toast({ title: "Parol o'zgartirildi", variant: "success" });
      router.push(user ? homeForRole(user.role) : "/login");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Xatolik yuz berdi";
      toast({ title: "Xatolik", description: message, variant: "error" });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <KeyRound className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">Parolni o'zgartirish</CardTitle>
          <CardDescription>
            {mustChange
              ? "Davom etishdan oldin yangi parol o'rnating"
              : "Yangi parolingizni kiriting"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            {!mustChange && (
              <PasswordField
                id="currentPassword"
                label="Joriy parol"
                invalid={!!errors.currentPassword}
                registration={register("currentPassword")}
              />
            )}

            <div>
              <PasswordField
                id="newPassword"
                label="Yangi parol"
                invalid={!!errors.newPassword}
                registration={register("newPassword")}
              />
              {errors.newPassword && (
                <p className="mt-2 text-xs text-destructive">
                  {errors.newPassword.message}
                </p>
              )}
            </div>

            <div>
              <PasswordField
                id="confirmPassword"
                label="Parolni tasdiqlang"
                invalid={!!errors.confirmPassword}
                registration={register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="mt-2 text-xs text-destructive">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={change.isPending}>
              {change.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
