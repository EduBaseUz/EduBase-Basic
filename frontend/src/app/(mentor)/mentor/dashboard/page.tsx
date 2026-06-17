"use client";

import {
  Boxes,
  ClipboardList,
  Users,
  Wallet,
  LayoutDashboard,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { FinanceChart } from "@/components/shared/charts";
import { useMentorDashboard } from "@/hooks/use-dashboard";
import { formatUZS } from "@/lib/utils";

export default function MentorDashboardPage() {
  const { data, isLoading } = useMentorDashboard();

  return (
    <div>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6" /> Boshqaruv paneli
          </span>
        }
        description="Sizning faoliyatingiz"
      />
      {isLoading || !data ? (
        <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Guruhlar" value={data.groups} icon={Boxes} />
            <StatCard title="Darslar" value={data.lessons} icon={ClipboardList} />
            <StatCard title="O'quvchilar" value={data.students} icon={Users} />
            <StatCard
              title="Shu oy maoshi"
              value={formatUZS(data.earnedThisMonth)}
              icon={Wallet}
            />
          </div>
          <FinanceChart
            title="Oylik maosh"
            data={data.monthly}
            incomeOnly
            incomeLabel="Maosh"
          />
        </div>
      )}
    </div>
  );
}
