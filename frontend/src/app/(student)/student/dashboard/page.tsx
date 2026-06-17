"use client";

import { Boxes, CalendarCheck, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { GradePie } from "@/components/shared/charts";
import { useStudentDashboard } from "@/hooks/use-dashboard";

export default function StudentDashboardPage() {
  const { data, isLoading } = useStudentDashboard();

  return (
    <div>
      <PageHeader title="Boshqaruv paneli" description="Sizning ko'rsatkichlaringiz" />
      {isLoading || !data ? (
        <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard title="Guruhlar" value={data.groups} icon={Boxes} />
            <StatCard
              title="Davomat"
              value={`${Math.round(data.attendanceRatio * 100)}%`}
              icon={CalendarCheck}
            />
            <StatCard title="Darslar" value={data.lessons} icon={ClipboardList} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <GradePie
              title="Baholar taqsimoti"
              data={[
                { name: "D (a'lo)", value: data.gradeLetters.D ?? 0 },
                { name: "M (yaxshi)", value: data.gradeLetters.M ?? 0 },
                { name: "P (yomon)", value: data.gradeLetters.P ?? 0 },
              ]}
            />
          </div>
        </div>
      )}
    </div>
  );
}
