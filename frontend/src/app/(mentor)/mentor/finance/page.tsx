"use client";

import { Wallet } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { FinanceChart } from "@/components/shared/charts";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMyPayouts } from "@/hooks/use-finance";
import { formatUZS } from "@/lib/utils";
import type { PayStatus } from "@/types";

function statusBadge(s: PayStatus) {
  if (s === "paid") return <Badge variant="success">To'langan</Badge>;
  if (s === "partial") return <Badge variant="warning">Qisman</Badge>;
  return <Badge variant="outline">Kutilmoqda</Badge>;
}

export default function MentorFinancePage() {
  const { data, isLoading } = useMyPayouts();

  const chartData = (data ?? [])
    .slice()
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((p) => ({ month: p.period, income: p.earnedAmount, expense: 0 }));

  return (
    <div>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Wallet className="h-6 w-6" /> Maoshim
          </span>
        }
        description="Hisoblangan va to'langan maosh"
      />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
      ) : (
        <div className="space-y-6">
          <FinanceChart
            title="Oylik maosh"
            data={chartData}
            incomeOnly
            incomeLabel="Maosh"
          />
          <Card>
            <CardHeader>
              <CardTitle>To'lovlar tarixi</CardTitle>
            </CardHeader>
            <CardContent>
              {!data?.length ? (
                <p className="text-sm text-muted-foreground">
                  Hozircha ma'lumot yo'q.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>T/R</TableHead>
                      <TableHead>Davr</TableHead>
                      <TableHead>Hisoblangan</TableHead>
                      <TableHead>To'langan</TableHead>
                      <TableHead>Holat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data
                      .slice()
                      .sort((a, b) => b.period.localeCompare(a.period))
                      .map((p, i) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-muted-foreground">
                            {i + 1}
                          </TableCell>
                          <TableCell>{p.period}</TableCell>
                          <TableCell>{formatUZS(p.earnedAmount)}</TableCell>
                          <TableCell>
                            {formatUZS(
                              p.transactions.reduce((a, t) => a + t.amount, 0),
                            )}
                          </TableCell>
                          <TableCell>{statusBadge(p.status)}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
