"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatUZS } from "@/lib/utils";

interface FinanceChartProps {
  title: string;
  data: { month: string; income: number; expense: number }[];
  /** when true, hide the expense series (mentor earnings view) */
  incomeOnly?: boolean;
  incomeLabel?: string;
}

export function FinanceChart({
  title,
  data,
  incomeOnly,
  incomeLabel = "Daromad",
}: FinanceChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="month" fontSize={12} />
            <YAxis
              fontSize={12}
              tickFormatter={(v) => new Intl.NumberFormat("uz-UZ").format(v)}
            />
            <Tooltip
              formatter={(v: number) => formatUZS(v)}
              contentStyle={{
                background: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend />
            <Bar dataKey="income" name={incomeLabel} fill="#16a34a" radius={[4, 4, 0, 0]} />
            {!incomeOnly && (
              <Bar dataKey="expense" name="Xarajat" fill="#dc2626" radius={[4, 4, 0, 0]} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

const PIE_COLORS = ["#16a34a", "#eab308", "#dc2626"];

interface GradePieProps {
  title: string;
  data: { name: string; value: number }[];
}

export function GradePie({ title, data }: GradePieProps) {
  const hasData = data.some((d) => d.value > 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                outerRadius={90}
                label
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Hozircha baholar yo'q
          </p>
        )}
      </CardContent>
    </Card>
  );
}
