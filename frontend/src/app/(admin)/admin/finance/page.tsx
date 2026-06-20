"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Plus,
  Pencil,
  Trash2,
  History,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { FinanceChart } from "@/components/shared/charts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import {
  useFinanceSummary,
  useTuition,
  usePayouts,
  useAddTuitionTransaction,
  useUpdateTuition,
  useDeleteTuitionTransaction,
  useAddPayoutTransaction,
  useDeletePayoutTransaction,
  useStudentTuitionHistory,
  useDebtors,
  useOrgTransactions,
  useCreateOrgTransaction,
  useUpdateOrgTransaction,
  useDeleteOrgTransaction,
} from "@/hooks/use-finance";
import { useCourses } from "@/hooks/use-courses";
import {
  formatUZS,
  formatThousands,
  formatDate,
  onlyDigits,
  cn,
} from "@/lib/utils";
import { ApiError } from "@/lib/api";
import type {
  Course,
  MentorPayout,
  OrgTransaction,
  PayStatus,
  StudentLedger,
  Transaction,
} from "@/types";

function statusBadge(s: PayStatus) {
  if (s === "paid") return <Badge variant="success">To&apos;langan</Badge>;
  if (s === "partial") return <Badge variant="warning">Qisman</Badge>;
  return <Badge variant="outline">Kutilmoqda</Badge>;
}

const paidOf = (txns: Transaction[]) => txns.reduce((a, t) => a + t.amount, 0);

type Tab = "summary" | "tuition" | "payouts" | "debtors" | "org";

export default function FinancePage() {
  const [tab, setTab] = React.useState<Tab>("summary");

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
      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            ["summary", "Umumiy"],
            ["tuition", "O'quvchi to'lovlari"],
            ["payouts", "Mentor maoshlari"],
            ["debtors", "Haqdorlar"],
            ["org", "Qo'shimcha to'lovlar"],
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
      {tab === "tuition" && <TuitionTab />}
      {tab === "payouts" && <PayoutsTab />}
      {tab === "debtors" && <DebtorsTab />}
      {tab === "org" && <OrgTransactionsTab />}
    </div>
  );
}

/* ------------------------------- Umumiy -------------------------------- */

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
        <StatCard title="Daromad" value={formatUZS(data?.totalIncome)} icon={TrendingUp} />
        <StatCard title="Xarajat" value={formatUZS(data?.totalExpense)} icon={TrendingDown} />
        <StatCard title="Foyda" value={formatUZS(data?.profit)} icon={Wallet} />
      </div>

      <FinanceChart title="Oylik daromad va xarajat" data={data?.monthly ?? []} />
    </div>
  );
}

/* --------------------- Mutaxassislik + oy tanlash --------------------- */

function useCourseAndPeriod() {
  const { data: courses } = useCourses();
  const [courseId, setCourseId] = React.useState("");
  const [period, setPeriod] = React.useState("");

  const course = courses?.items.find((c) => c.id === courseId);
  const periods = [...(course?.priceEntries ?? [])].sort((a, b) =>
    a.startDate.localeCompare(b.startDate),
  );

  const selector = (
    <div className="mb-4 grid gap-4 sm:grid-cols-2">
      <div className="space-y-1">
        <Label>Mutaxassislik</Label>
        <Select
          value={courseId}
          onChange={(e) => {
            setCourseId(e.target.value);
            setPeriod("");
          }}
        >
          <option value="">— Tanlang —</option>
          {courses?.items.map((c: Course) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Oylik (davr)</Label>
        <Select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          disabled={!courseId}
        >
          <option value="">— Tanlang —</option>
          {periods.map((p, i) => (
            <option key={i} value={p.startDate.slice(0, 10)}>
              {formatDate(p.startDate)} — {formatDate(p.endDate)}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );

  return { courseId, period, selector };
}

/* --------------------------- O'quvchi to'lovlari --------------------------- */

function TuitionTab() {
  const { courseId, period, selector } = useCourseAndPeriod();
  const { data, isLoading } = useTuition(courseId, period);
  const { toast } = useToast();
  const addTxn = useAddTuitionTransaction();
  const updateLedger = useUpdateTuition();
  const delTxn = useDeleteTuitionTransaction();
  const [active, setActive] = React.useState<StudentLedger | null>(null);
  const [historyFor, setHistoryFor] = React.useState<StudentLedger | null>(null);

  return (
    <div>
      {selector}

      {!courseId || !period ? (
        <p className="text-sm text-muted-foreground">
          Mutaxassislik va oylik (davr)ni tanlang.
        </p>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
      ) : !data?.length ? (
        <p className="text-sm text-muted-foreground">
          Bu oyda o&apos;qiyotgan o&apos;quvchi yo&apos;q.
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>T/R</TableHead>
                <TableHead>O&apos;quvchi</TableHead>
                <TableHead>Guruh</TableHead>
                <TableHead>Hisoblangan</TableHead>
                <TableHead>Chegirma</TableHead>
                <TableHead>To&apos;langan</TableHead>
                <TableHead>Qoldiq</TableHead>
                <TableHead>Holat</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, i) => {
                const l = row.ledger;
                const paid = paidOf(l.transactions);
                const remaining = l.totalDue - l.discount - paid;
                return (
                  <TableRow key={l.id}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">
                      {row.student.fullName}
                    </TableCell>
                    <TableCell>{row.groupName}</TableCell>
                    <TableCell>{formatUZS(l.totalDue)}</TableCell>
                    <TableCell>{formatUZS(l.discount)}</TableCell>
                    <TableCell>{formatUZS(paid)}</TableCell>
                    <TableCell className={cn(remaining > 0 && "text-destructive")}>
                      {formatUZS(remaining)}
                    </TableCell>
                    <TableCell>{statusBadge(l.status)}</TableCell>
                    <TableCell className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActive(row)}
                      >
                        <Plus className="h-4 w-4" /> To&apos;lov
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="To'lovlar tarixi"
                        onClick={() => setHistoryFor(row)}
                      >
                        <History className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {active && (
        <TuitionDialog
          row={active}
          onClose={() => setActive(null)}
          onAddTxn={async (amount, comment) => {
            try {
              await addTxn.mutateAsync({
                id: active.ledger.id,
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
                id: active.ledger.id,
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
          onDeleteTxn={async (txnId) => {
            try {
              await delTxn.mutateAsync({ id: active.ledger.id, txnId });
              toast({ title: "To'lov o'chirildi", variant: "success" });
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

      {historyFor && (
        <StudentHistoryDialog
          studentId={historyFor.student.id}
          studentName={historyFor.student.fullName}
          onClose={() => setHistoryFor(null)}
        />
      )}
    </div>
  );
}

function TuitionDialog({
  row,
  onClose,
  onAddTxn,
  onSetDiscount,
  onDeleteTxn,
}: {
  row: StudentLedger;
  onClose: () => void;
  onAddTxn: (amount: number, comment: string) => void;
  onSetDiscount: (discount: number) => void;
  onDeleteTxn: (txnId: string) => void;
}) {
  const l = row.ledger;
  const paid = paidOf(l.transactions);
  const payable = l.totalDue - l.discount;
  const remaining = payable - paid;
  const [discount, setDiscount] = React.useState(String(l.discount));
  const [amount, setAmount] = React.useState("");
  const [comment, setComment] = React.useState("");

  const submit = () => {
    const n = Number(amount);
    if (!n || n <= 0) return;
    if (n > remaining) {
      setAmount(String(remaining));
      return;
    }
    onAddTxn(n, comment);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle>
            {row.student.fullName} — {formatDate(l.period)}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md border p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Hisoblangan</span>
              <span>{formatUZS(l.totalDue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">To&apos;langan</span>
              <span>{formatUZS(paid)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-muted-foreground">Qoldiq</span>
              <span className={cn(remaining > 0 && "text-destructive")}>
                {formatUZS(remaining)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Chegirma (so&apos;m)</Label>
            <div className="flex gap-2">
              <Input
                inputMode="numeric"
                value={formatThousands(discount)}
                onChange={(e) => setDiscount(onlyDigits(e.target.value, 12))}
              />
              <Button
                variant="outline"
                onClick={() => onSetDiscount(Number(discount || 0))}
              >
                Saqlash
              </Button>
            </div>
          </div>

          {l.transactions.length > 0 && (
            <div className="space-y-1">
              <Label>To&apos;lovlar</Label>
              <div className="divide-y rounded-md border text-sm">
                {l.transactions.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <span>
                      {formatUZS(t.amount)}{" "}
                      <span className="text-muted-foreground">
                        {formatDate(t.date)}
                        {t.comment ? ` · ${t.comment}` : ""}
                      </span>
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onDeleteTxn(t.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3 border-t pt-4">
            <Label>Yangi to&apos;lov (maks. {formatUZS(remaining)})</Label>
            <Input
              inputMode="numeric"
              placeholder="Summa"
              value={formatThousands(amount)}
              onChange={(e) => setAmount(onlyDigits(e.target.value, 12))}
            />
            <Input
              placeholder="Izoh (ixtiyoriy)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <Button className="w-full" onClick={submit} disabled={remaining <= 0}>
              To&apos;lovni qo&apos;shish
            </Button>
          </div>
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

function StudentHistoryDialog({
  studentId,
  studentName,
  onClose,
}: {
  studentId: string;
  studentName: string;
  onClose: () => void;
}) {
  const { data, isLoading } = useStudentTuitionHistory(studentId);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent onClose={onClose} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{studentName} — to&apos;lovlar tarixi</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground">Yozuv yo&apos;q.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Davr</TableHead>
                <TableHead>Hisoblangan</TableHead>
                <TableHead>Chegirma</TableHead>
                <TableHead>To&apos;langan</TableHead>
                <TableHead>Holat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{formatDate(l.period)}</TableCell>
                  <TableCell>{formatUZS(l.totalDue)}</TableCell>
                  <TableCell>{formatUZS(l.discount)}</TableCell>
                  <TableCell>{formatUZS(paidOf(l.transactions))}</TableCell>
                  <TableCell>{statusBadge(l.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Yopish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------- Mentor maoshlari ----------------------------- */

function PayoutsTab() {
  const { courseId, period, selector } = useCourseAndPeriod();
  const { data, isLoading } = usePayouts(courseId, period);
  const { toast } = useToast();
  const addTxn = useAddPayoutTransaction();
  const delTxn = useDeletePayoutTransaction();
  const [active, setActive] = React.useState<MentorPayout | null>(null);

  return (
    <div>
      {selector}

      {!courseId || !period ? (
        <p className="text-sm text-muted-foreground">
          Mutaxassislik va oylik (davr)ni tanlang.
        </p>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
      ) : !data?.length ? (
        <p className="text-sm text-muted-foreground">Bu oyda mentor yo&apos;q.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>T/R</TableHead>
                <TableHead>Mentor</TableHead>
                <TableHead>Hisoblangan</TableHead>
                <TableHead>To&apos;langan</TableHead>
                <TableHead>Haqdor (qoldiq)</TableHead>
                <TableHead>Holat</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, i) => {
                const p = row.payout;
                const paid = paidOf(p.transactions);
                const remaining = p.earnedAmount - paid;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">
                      {row.mentor.fullName}
                    </TableCell>
                    <TableCell>{formatUZS(p.earnedAmount)}</TableCell>
                    <TableCell>{formatUZS(paid)}</TableCell>
                    <TableCell className={cn(remaining > 0 && "text-amber-600")}>
                      {formatUZS(remaining)}
                    </TableCell>
                    <TableCell>{statusBadge(p.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActive(row)}
                      >
                        <Plus className="h-4 w-4" /> To&apos;lov
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {active && (
        <PayoutDialog
          row={active}
          onClose={() => setActive(null)}
          onAddTxn={async (amount, comment) => {
            try {
              await addTxn.mutateAsync({
                id: active.payout.id,
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
          onDeleteTxn={async (txnId) => {
            try {
              await delTxn.mutateAsync({ id: active.payout.id, txnId });
              toast({ title: "To'lov o'chirildi", variant: "success" });
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
  row,
  onClose,
  onAddTxn,
  onDeleteTxn,
}: {
  row: MentorPayout;
  onClose: () => void;
  onAddTxn: (amount: number, comment: string) => void;
  onDeleteTxn: (txnId: string) => void;
}) {
  const p = row.payout;
  const paid = paidOf(p.transactions);
  const remaining = p.earnedAmount - paid;
  const [amount, setAmount] = React.useState("");
  const [comment, setComment] = React.useState("");

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle>
            {row.mentor.fullName} — {formatDate(p.period)}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md border p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Hisoblangan</span>
              <span>{formatUZS(p.earnedAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">To&apos;langan</span>
              <span>{formatUZS(paid)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-muted-foreground">Qoldiq</span>
              <span className={cn(remaining > 0 && "text-amber-600")}>
                {formatUZS(remaining)}
              </span>
            </div>
          </div>

          {p.transactions.length > 0 && (
            <div className="space-y-1">
              <Label>To&apos;lovlar</Label>
              <div className="divide-y rounded-md border text-sm">
                {p.transactions.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <span>
                      {formatUZS(t.amount)}{" "}
                      <span className="text-muted-foreground">
                        {formatDate(t.date)}
                        {t.comment ? ` · ${t.comment}` : ""}
                      </span>
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onDeleteTxn(t.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3 border-t pt-4">
            <Label>Yangi to&apos;lov</Label>
            <Input
              inputMode="numeric"
              placeholder="Summa"
              value={formatThousands(amount)}
              onChange={(e) => setAmount(onlyDigits(e.target.value, 12))}
            />
            <Input
              placeholder="Izoh (ixtiyoriy)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <Button
              className="w-full"
              onClick={() => {
                const n = Number(amount);
                if (n > 0) onAddTxn(n, comment);
              }}
            >
              To&apos;lovni qo&apos;shish
            </Button>
          </div>
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

/* ------------------------------- Haqdorlar ------------------------------- */

function DebtorsTab() {
  const { data, isLoading } = useDebtors();

  const renderTable = (
    title: string,
    rows: { userId: string; fullName: string; charged: number; paid: number; balance: number }[],
    owedLabel: string,
  ) => (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">
        {title} ({rows.length})
      </h3>
      {!rows.length ? (
        <p className="text-sm text-muted-foreground">Qarzdorlik yo&apos;q.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>F.I.O.</TableHead>
                <TableHead>Hisoblangan</TableHead>
                <TableHead>To&apos;langan</TableHead>
                <TableHead>{owedLabel}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.userId}>
                  <TableCell className="font-medium">{r.fullName}</TableCell>
                  <TableCell>{formatUZS(r.charged)}</TableCell>
                  <TableCell>{formatUZS(r.paid)}</TableCell>
                  <TableCell className="font-medium">
                    {formatUZS(r.balance)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>;
  }

  return (
    <div className="space-y-6">
      {renderTable("O'quvchilar (qarzdor)", data?.students ?? [], "Qoldiq (qarz)")}
      {renderTable("Mentorlar (haqdor)", data?.mentors ?? [], "Qoldiq (haq)")}
    </div>
  );
}

/* ---------------------- Qo'shimcha to'lovlar (kirim/chiqim) -------------------- */

interface OrgFormState {
  kind: "income" | "expense";
  category: string;
  amount: string;
  comment: string;
  date: string;
}

const emptyOrgForm = (): OrgFormState => ({
  kind: "expense",
  category: "",
  amount: "",
  comment: "",
  date: new Date().toISOString().slice(0, 10),
});

function OrgTransactionsTab() {
  const { data, isLoading } = useOrgTransactions();
  const createTxn = useCreateOrgTransaction();
  const updateTxn = useUpdateOrgTransaction();
  const deleteTxn = useDeleteOrgTransaction();
  const { toast } = useToast();

  const [open, setOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [toDelete, setToDelete] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<OrgFormState>(emptyOrgForm());

  const items = data?.items ?? [];
  const income = items
    .filter((t) => t.kind === "income")
    .reduce((a, t) => a + t.amount, 0);
  const expense = items
    .filter((t) => t.kind === "expense")
    .reduce((a, t) => a + t.amount, 0);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyOrgForm());
    setOpen(true);
  };

  const openEdit = (t: OrgTransaction) => {
    setEditId(t.id);
    setForm({
      kind: t.kind,
      category: t.category ?? "",
      amount: String(t.amount),
      comment: t.comment ?? "",
      date: t.date.slice(0, 10),
    });
    setOpen(true);
  };

  const onSubmit = async () => {
    if (form.amount === "" || Number(form.amount) <= 0) {
      toast({ title: "Summani kiriting", variant: "error" });
      return;
    }
    const body = {
      kind: form.kind,
      category: form.category,
      amount: Number(form.amount),
      comment: form.comment,
      date: form.date,
    };
    try {
      if (editId) {
        await updateTxn.mutateAsync({ id: editId, body });
        toast({ title: "Yangilandi", variant: "success" });
      } else {
        await createTxn.mutateAsync(body);
        toast({ title: "Qo'shildi", variant: "success" });
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

  const onDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteTxn.mutateAsync(toDelete);
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

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Kirim" value={formatUZS(income)} icon={TrendingUp} />
        <StatCard title="Chiqim" value={formatUZS(expense)} icon={TrendingDown} />
        <StatCard title="Sof" value={formatUZS(income - expense)} icon={Wallet} />
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Yangi to&apos;lov
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
      ) : !items.length ? (
        <p className="text-sm text-muted-foreground">Hozircha yozuv yo&apos;q.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sana</TableHead>
                <TableHead>Turi</TableHead>
                <TableHead>Kategoriya</TableHead>
                <TableHead>Izoh</TableHead>
                <TableHead className="text-right">Summa</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{formatDate(t.date)}</TableCell>
                  <TableCell>
                    {t.kind === "income" ? (
                      <Badge variant="success">Kirim</Badge>
                    ) : (
                      <Badge variant="destructive">Chiqim</Badge>
                    )}
                  </TableCell>
                  <TableCell>{t.category || "—"}</TableCell>
                  <TableCell className="max-w-[18rem] truncate text-muted-foreground">
                    {t.comment || "—"}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium",
                      t.kind === "income" ? "text-green-600" : "text-destructive",
                    )}
                  >
                    {t.kind === "income" ? "+" : "−"}
                    {formatUZS(t.amount)}
                  </TableCell>
                  <TableCell className="flex justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Tahrirlash"
                      onClick={() => openEdit(t)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="O'chirish"
                      onClick={() => setToDelete(t.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle>
              {editId ? "To'lovni tahrirlash" : "Yangi qo'shimcha to'lov"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Turi</Label>
                <Select
                  value={form.kind}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      kind: e.target.value as "income" | "expense",
                    }))
                  }
                >
                  <option value="expense">Chiqim</option>
                  <option value="income">Kirim</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sana</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, date: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Kategoriya</Label>
              <Input
                placeholder={
                  form.kind === "income"
                    ? "Masalan: loyiha, qo'shimcha"
                    : "Masalan: elektr, gaz, wifi"
                }
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Summa (so&apos;m)</Label>
              <Input
                inputMode="numeric"
                placeholder="500 000"
                value={formatThousands(form.amount)}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    amount: onlyDigits(e.target.value, 12),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Izoh</Label>
              <Textarea
                placeholder="Qisqacha izoh"
                value={form.comment}
                onChange={(e) =>
                  setForm((f) => ({ ...f, comment: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              onClick={onSubmit}
              disabled={createTxn.isPending || updateTxn.isPending}
            >
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Yozuvni o'chirish"
        description="Bu moliyaviy yozuvni o'chirmoqchimisiz?"
        confirmLabel="O'chirish"
        variant="destructive"
        loading={deleteTxn.isPending}
        onConfirm={onDelete}
      />
    </div>
  );
}
