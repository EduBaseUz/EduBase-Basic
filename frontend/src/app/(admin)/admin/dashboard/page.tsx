"use client";

import {
  Users,
  GraduationCap,
  BookOpen,
  Boxes,
  TrendingUp,
  TrendingDown,
  Wallet,
  LayoutDashboard,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { FinanceChart } from "@/components/shared/charts";
import { useAdminDashboard } from "@/hooks/use-dashboard";
import { formatUZS } from "@/lib/utils";

export default function AdminDashboardPage() {
  const { data, isLoading } = useAdminDashboard();

  return (
    <div>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6" /> Boshqaruv paneli
          </span>
        }
        description="O'quv markazining umumiy ko'rsatkichlari"
      />
      {isLoading || !data ? (
        <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="O'quvchilar" value={data.students} icon={GraduationCap} />
            <StatCard title="Mentorlar" value={data.mentors} icon={Users} />
            <StatCard title="Kurslar" value={data.courses} icon={BookOpen} />
            <StatCard title="Guruhlar" value={data.groups} icon={Boxes} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              title="Umumiy daromad"
              value={formatUZS(data.finance.totalIncome)}
              icon={TrendingUp}
            />
            <StatCard
              title="Umumiy xarajat"
              value={formatUZS(data.finance.totalExpense)}
              icon={TrendingDown}
            />
            <StatCard
              title="Sof foyda"
              value={formatUZS(data.finance.profit)}
              icon={Wallet}
            />
          </div>

          <FinanceChart
            title="Oylik daromad va xarajat"
            data={data.finance.monthly}
          />
        </div>
      )}
    </div>
  );
}
