"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound, Pencil } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { useToast } from "@/components/ui/toast";
import { useUserDetail, useResetPassword } from "@/hooks/use-users";
import { formatPhoneDisplay, formatUZS, formatDate } from "@/lib/utils";
import { ApiError } from "@/lib/api";
import { roleMeta, type ManagedRole } from "@/components/shared/users/role-config";
import type { PayStatus } from "@/types";

function payBadge(s: PayStatus) {
  if (s === "paid") return <Badge variant="success">To'langan</Badge>;
  if (s === "partial") return <Badge variant="warning">Qisman</Badge>;
  return <Badge variant="outline">Kutilmoqda</Badge>;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export function UserDetailView({ role, id }: { role: ManagedRole; id: string }) {
  const meta = roleMeta[role];
  const { data, isLoading } = useUserDetail(id);
  const resetPw = useResetPassword();
  const { toast } = useToast();
  const [confirmReset, setConfirmReset] = React.useState(false);

  const onReset = async () => {
    try {
      await resetPw.mutateAsync(id);
      toast({ title: "Parol tiklandi", variant: "success" });
      setConfirmReset(false);
    } catch (err) {
      toast({
        title: "Xatolik",
        description: err instanceof ApiError ? err.message : "Xatolik",
        variant: "error",
      });
    }
  };

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>;
  }

  const u = data.user;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={u.fullName}
        action={
          <div className="flex gap-2">
            <Link
              href={meta.basePath}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ArrowLeft className="h-4 w-4" /> Orqaga
            </Link>
            <Link
              href={`${meta.basePath}/${id}/edit`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Pencil className="h-4 w-4" /> Tahrirlash
            </Link>
            <Button size="sm" onClick={() => setConfirmReset(true)}>
              <KeyRound className="h-4 w-4" /> Parolni tiklash
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Shaxsiy ma'lumotlar</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow label="F.I.O." value={u.fullName} />
            <InfoRow label="Telefon" value={formatPhoneDisplay(u.phone)} />
            <InfoRow label="Manzil" value={u.address || "—"} />
            <InfoRow
              label="Holat"
              value={
                u.status === "active" ? (
                  <Badge variant="success">Faol</Badge>
                ) : (
                  <Badge variant="outline">Nofaol</Badge>
                )
              }
            />
            {role === "mentor" && (
              <InfoRow
                label="Mutaxassisliklar"
                value={
                  (u.specializations?.length
                    ? u.specializations
                    : u.specialization
                      ? [u.specialization]
                      : []
                  ).join(", ") || "—"
                }
              />
            )}
            {role === "student" && (
              <InfoRow
                label="Ota-ona"
                value={data.parent ? data.parent.fullName : "Biriktirilmagan"}
              />
            )}
          </CardContent>
        </Card>

        {/* Guruhlar (mentor va talaba) */}
        {(role === "mentor" || role === "student") && (
          <Card>
            <CardHeader>
              <CardTitle>Guruhlar</CardTitle>
            </CardHeader>
            <CardContent>
              {!data.groups?.length ? (
                <p className="text-sm text-muted-foreground">Guruh yo'q.</p>
              ) : (
                <ul className="space-y-2">
                  {data.groups.map((g) => (
                    <li
                      key={g.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                    >
                      <span>{g.name}</span>
                      <Badge variant={g.status === "active" ? "success" : "outline"}>
                        {g.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Mentor maoshlari */}
      {role === "mentor" && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Oylik maoshlar</CardTitle>
          </CardHeader>
          <CardContent>
            {!data.payouts?.length ? (
              <p className="text-sm text-muted-foreground">Ma'lumot yo'q.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Davr</TableHead>
                    <TableHead>Hisoblangan</TableHead>
                    <TableHead>To'langan</TableHead>
                    <TableHead>Holat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.payouts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.period}</TableCell>
                      <TableCell>{formatUZS(p.earnedAmount)}</TableCell>
                      <TableCell>
                        {formatUZS(
                          p.transactions.reduce((a, t) => a + t.amount, 0),
                        )}
                      </TableCell>
                      <TableCell>{payBadge(p.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Talaba to'lovlari */}
      {role === "student" && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>To'lovlar</CardTitle>
          </CardHeader>
          <CardContent>
            {!data.tuition?.length ? (
              <p className="text-sm text-muted-foreground">Ma'lumot yo'q.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Davr</TableHead>
                    <TableHead>Hisoblangan</TableHead>
                    <TableHead>To'langan</TableHead>
                    <TableHead>Holat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.tuition.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{t.period}</TableCell>
                      <TableCell>{formatUZS(t.totalDue)}</TableCell>
                      <TableCell>
                        {formatUZS(
                          t.transactions.reduce((a, x) => a + x.amount, 0),
                        )}
                      </TableCell>
                      <TableCell>{payBadge(t.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ota-ona farzandlari */}
      {role === "parent" && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Farzandlar</CardTitle>
          </CardHeader>
          <CardContent>
            {!data.children?.length ? (
              <p className="text-sm text-muted-foreground">
                Farzand biriktirilmagan.
              </p>
            ) : (
              <ul className="space-y-2">
                {data.children.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <span>
                      {c.fullName}{" "}
                      <span className="text-muted-foreground">
                        {formatPhoneDisplay(c.phone)}
                      </span>
                    </span>
                    <Link
                      href={`/admin/users/students/${c.id}`}
                      className={buttonVariants({ variant: "ghost", size: "sm" })}
                    >
                      Ko'rish
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Yaratilgan: {formatDate(u.createdAt)}
      </p>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Parolni tiklash"
        description={`${u.fullName} parolini telefon raqamiga qaytarmoqchimisiz? Foydalanuvchi keyingi kirishda yangi parol o'rnatadi.`}
        confirmLabel="Tiklash"
        loading={resetPw.isPending}
        onConfirm={onReset}
      />
    </div>
  );
}
