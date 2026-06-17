"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { TrendingUp, TrendingDown, Wallet, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { FinanceChart } from "@/components/shared/charts";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  useFinanceSummary,
  useTuition,
  usePayouts,
  useAddTuitionTransaction,
  useUpdateTuition,
  useAddPayoutTransaction,
} from "@/hooks/use-finance";
import { useUsers } from "@/hooks/use-users";
import { useGroups } from "@/hooks/use-groups";
import { formatUZS, currentPeriod } from "@/lib/utils";
import { ApiError } from "@/lib/api";
import type { ColumnDef } from "@tanstack/react-table";
import type { Payout, TuitionLedger, PayStatus } from "@/types";

function statusBadge(s: PayStatus) {
  if (s === "paid") return <Badge variant="success">To'langan</Badge>;
  if (s === "partial") return <Badge variant="warning">Qisman</Badge>;
  return <Badge variant="outline">Kutilmoqda</Badge>;
}

type Tab = "summary" | "tuition" | "payouts";

export default function FinancePage() {
  const [tab, setTab] = React.useState<Tab>("summary");
  const [period, setPeriod] = React.useState(currentPeriod());

  return (
    <div>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Wallet className="h-6 w-6" /> Moliya
          </span>
        }
        description="Daromad, xarajat va to'lovlar"
      />
      <div className="mb-6 flex gap-2">
        {(
          [
            ["summary", "Umumiy"],
            ["tuition", "O'quvchi to'lovlari"],
            ["payouts", "Mentor maoshlari"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <Button
            key={key}
            variant={tab === key ? "default" : "outline"}
            size="sm"
            onClick={() => setTab(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === "summary" && <SummaryTab />}
      {tab !== "summary" && (
        <div className="mb-4 max-w-xs">
          <Label>Davr (oy)</Label>
          <Input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
        </div>
      )}
      {tab === "tuition" && <TuitionTab period={period} />}
      {tab === "payouts" && <PayoutsTab period={period} />}
    </div>
  );
}

function SummaryTab() {
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const { data } = useFinanceSummary({ from, to });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label>Dan</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Gacha</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        {(from || to) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFrom("");
              setTo("");
            }}
          >
            Tozalash
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Daromad"
          value={formatUZS(data?.totalIncome)}
          icon={TrendingUp}
        />
        <StatCard
          title="Xarajat"
          value={formatUZS(data?.totalExpense)}
          icon={TrendingDown}
        />
        <StatCard title="Foyda" value={formatUZS(data?.profit)} icon={Wallet} />
      </div>

      <FinanceChart
        title="Oylik daromad va xarajat"
        data={data?.monthly ?? []}
      />
    </div>
  );
}

function TuitionTab({ period }: { period: string }) {
  const { data, isLoading } = useTuition(period);
  const { data: students } = useUsers({ role: "student" });
  const { data: groups } = useGroups();
  const addTxn = useAddTuitionTransaction();
  const updateLedger = useUpdateTuition();
  const { toast } = useToast();
  const [active, setActive] = React.useState<TuitionLedger | null>(null);

  const nameOf = (id: string) =>
    students?.items.find((s) => s.id === id)?.fullName ?? "—";
  const groupOf = (id: string) =>
    groups?.items.find((g) => g.id === id)?.name ?? "—";

  const paid = (l: TuitionLedger) =>
    l.transactions.reduce((a, t) => a + t.amount, 0);

  const columns: ColumnDef<TuitionLedger>[] = [
    {
      id: "index",
      header: "T/R",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.index + 1}</span>
      ),
    },
    { id: "student", header: "O'quvchi", cell: ({ row }) => nameOf(row.original.studentId) },
    { id: "group", header: "Guruh", cell: ({ row }) => groupOf(row.original.groupId) },
    { id: "due", header: "Hisoblangan", cell: ({ row }) => formatUZS(row.original.totalDue) },
    { id: "discount", header: "Chegirma", cell: ({ row }) => formatUZS(row.original.discount) },
    { id: "paid", header: "To'langan", cell: ({ row }) => formatUZS(paid(row.original)) },
    { id: "status", header: "Holat", cell: ({ row }) => statusBadge(row.original.status) },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button variant="outline" size="sm" onClick={() => setActive(row.original)}>
          <Plus className="h-4 w-4" /> To'lov
        </Button>
      ),
    },
  ];

  return (
    <div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
      ) : (
        <DataTable columns={columns} data={data?.items ?? []} searchKey="" />
      )}
      {active && (
        <TuitionDialog
          ledger={active}
          studentName={nameOf(active.studentId)}
          onClose={() => setActive(null)}
          onAddTxn={async (amount, comment) => {
            try {
              await addTxn.mutateAsync({
                id: active.id,
                body: { amount, comment },
              });
              toast({ title: "To'lov qabul qilindi", variant: "success" });
              setActive(null);
            } catch (err) {
              toast({
                title: "Xatolik",
                description: err instanceof ApiError ? err.message : "Xatolik",
                variant: "error",
              });
            }
          }}
          onSetDiscount={async (discount) => {
            try {
              await updateLedger.mutateAsync({
                id: active.id,
                body: { discount },
              });
              toast({ title: "Chegirma saqlandi", variant: "success" });
              setActive(null);
            } catch (err) {
              toast({
                title: "Xatolik",
                description: err instanceof ApiError ? err.message : "Xatolik",
                variant: "error",
              });
            }
          }}
        />
      )}
    </div>
  );
}

function TuitionDialog({
  ledger,
  studentName,
  onClose,
  onAddTxn,
  onSetDiscount,
}: {
  ledger: TuitionLedger;
  studentName: string;
  onClose: () => void;
  onAddTxn: (amount: number, comment: string) => void;
  onSetDiscount: (discount: number) => void;
}) {
  const { register, handleSubmit } = useForm<{ amount: number; comment: string }>();
  const [discount, setDiscount] = React.useState(ledger.discount);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle>{studentName} — {ledger.period}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md border p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Hisoblangan</span>
              <span>{formatUZS(ledger.totalDue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">To'langan</span>
              <span>
                {formatUZS(
                  ledger.transactions.reduce((a, t) => a + t.amount, 0),
                )}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Chegirma (so'm)</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min={0}
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
              />
              <Button variant="outline" onClick={() => onSetDiscount(discount)}>
                Saqlash
              </Button>
            </div>
          </div>

          <form
            onSubmit={handleSubmit((v) =>
              onAddTxn(Number(v.amount), v.comment ?? ""),
            )}
            className="space-y-3 border-t pt-4"
          >
            <Label>Yangi to'lov</Label>
            <Input
              type="number"
              min={1}
              placeholder="Summa"
              {...register("amount", { required: true })}
            />
            <Input placeholder="Izoh (ixtiyoriy)" {...register("comment")} />
            <Button type="submit" className="w-full">
              To'lovni qo'shish
            </Button>
          </form>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Yopish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PayoutsTab({ period }: { period: string }) {
  const { data, isLoading } = usePayouts(period);
  const { data: mentors } = useUsers({ role: "mentor" });
  const addTxn = useAddPayoutTransaction();
  const { toast } = useToast();
  const [active, setActive] = React.useState<Payout | null>(null);

  const nameOf = (id: string) =>
    mentors?.items.find((m) => m.id === id)?.fullName ?? "—";
  const paid = (p: Payout) => p.transactions.reduce((a, t) => a + t.amount, 0);

  const columns: ColumnDef<Payout>[] = [
    {
      id: "index",
      header: "T/R",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.index + 1}</span>
      ),
    },
    { id: "mentor", header: "Mentor", cell: ({ row }) => nameOf(row.original.mentorId) },
    { id: "earned", header: "Hisoblangan", cell: ({ row }) => formatUZS(row.original.earnedAmount) },
    { id: "paid", header: "To'langan", cell: ({ row }) => formatUZS(paid(row.original)) },
    { id: "status", header: "Holat", cell: ({ row }) => statusBadge(row.original.status) },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button variant="outline" size="sm" onClick={() => setActive(row.original)}>
          <Plus className="h-4 w-4" /> To'lov
        </Button>
      ),
    },
  ];

  return (
    <div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
      ) : (
        <DataTable columns={columns} data={data?.items ?? []} searchKey="" />
      )}
      {active && (
        <PayoutDialog
          payout={active}
          mentorName={nameOf(active.mentorId)}
          onClose={() => setActive(null)}
          onAddTxn={async (amount, comment) => {
            try {
              await addTxn.mutateAsync({
                id: active.id,
                body: { amount, comment },
              });
              toast({ title: "To'lov qabul qilindi", variant: "success" });
              setActive(null);
            } catch (err) {
              toast({
                title: "Xatolik",
                description: err instanceof ApiError ? err.message : "Xatolik",
                variant: "error",
              });
            }
          }}
        />
      )}
    </div>
  );
}

function PayoutDialog({
  payout,
  mentorName,
  onClose,
  onAddTxn,
}: {
  payout: Payout;
  mentorName: string;
  onClose: () => void;
  onAddTxn: (amount: number, comment: string) => void;
}) {
  const { register, handleSubmit } = useForm<{ amount: number; comment: string }>();
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle>{mentorName} — {payout.period}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md border p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Hisoblangan</span>
              <span>{formatUZS(payout.earnedAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">To'langan</span>
              <span>
                {formatUZS(payout.transactions.reduce((a, t) => a + t.amount, 0))}
              </span>
            </div>
          </div>
          <form
            onSubmit={handleSubmit((v) =>
              onAddTxn(Number(v.amount), v.comment ?? ""),
            )}
            className="space-y-3"
          >
            <Label>Yangi to'lov</Label>
            <Input
              type="number"
              min={1}
              placeholder="Summa"
              {...register("amount", { required: true })}
            />
            <Input placeholder="Izoh (ixtiyoriy)" {...register("comment")} />
            <Button type="submit" className="w-full">
              To'lovni qo'shish
            </Button>
          </form>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Yopish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
