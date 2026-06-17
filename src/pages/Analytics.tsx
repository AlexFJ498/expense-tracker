import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { FiltersBar } from "../components/FiltersBar";
import { api } from "../lib/api";
import type { Analytics, Category, MovementFilter } from "../lib/types";
import { formatEuro, formatEuroSigned } from "../lib/utils";
import { useLanguage } from "../lib/i18n";

const PALETTE = [
  "hsl(152, 70%, 50%)",
  "hsl(210, 80%, 60%)",
  "hsl(30, 90%, 60%)",
  "hsl(280, 65%, 65%)",
  "hsl(0, 70%, 60%)",
  "hsl(180, 60%, 50%)",
  "hsl(50, 85%, 55%)",
  "hsl(320, 60%, 60%)",
  "hsl(100, 55%, 50%)",
  "hsl(240, 60%, 65%)",
  "hsl(15, 75%, 60%)",
  "hsl(200, 60%, 50%)",
];

function tooltipStyle(): React.CSSProperties {
  return {
    backgroundColor: "hsl(222 24% 10%)",
    border: "1px solid hsl(217 19% 18%)",
    borderRadius: 8,
    fontSize: 12,
  };
}

function KPI({
  title,
  value,
  icon: Icon,
  tone = "default",
  footnote,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "positive" | "negative";
  footnote?: string;
}) {
  const toneClass =
    tone === "positive" ? "text-success" : tone === "negative" ? "text-danger" : "text-foreground";
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-semibold num ${toneClass}`}>{value}</div>
        {footnote && <div className="text-xs text-muted-foreground mt-1">{footnote}</div>}
      </CardContent>
    </Card>
  );
}

export function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState<MovementFilter>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, cats] = await Promise.all([
        api.getAnalytics(filter),
        api.listCategories(),
      ]);
      setData(a);
      setCategories(cats);
    } catch (e) {
      setData(null);
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <div className="text-sm text-muted-foreground">{t("analytics.loading")}</div>;
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="pt-5 text-sm text-muted-foreground flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 text-danger" />
          <div>
            <div className="font-medium text-foreground">{t("analytics.errorTitle")}</div>
            {error && <div className="mt-1">{error}</div>}
          </div>
        </CardContent>
      </Card>
    );
  }

  const s = data.summary;
  const topCategories = data.categories.slice(0, 8);
  const pieData = topCategories.map((c) => ({
    name: c.category,
    value: Math.round(c.expense * 100) / 100,
  }));

  const yearKeys = Array.from(
    new Set(data.year_comparison.flatMap((p) => Object.keys(p.values))),
  ).sort();

  const necessarySplitData = [
    { name: t("analytics.necessary"), value: Math.round(data.necessary_split.necessary * 100) / 100 },
    { name: t("analytics.discretionary"), value: Math.round(data.necessary_split.discretionary * 100) / 100 },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t("analytics.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("analytics.subtitle")}
        </p>
      </div>

      <FiltersBar
        filter={filter}
        onChange={setFilter}
        categories={categories}
        years={data.years}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPI
          title={t("analytics.balance")}
          value={formatEuroSigned(s.balance)}
          icon={Wallet}
          tone={s.balance >= 0 ? "positive" : "negative"}
          footnote={`${s.count} ${t("analytics.movements")}`}
        />
        <KPI
          title={t("analytics.income")}
          value={formatEuro(s.income_total)}
          icon={TrendingUp}
          tone="positive"
        />
        <KPI
          title={t("analytics.expense")}
          value={formatEuro(s.expense_total)}
          icon={TrendingDown}
          tone="negative"
          footnote={
            s.max_expense_category
              ? `${t("analytics.highest")} ${formatEuro(s.max_expense)} (${s.max_expense_category})`
              : undefined
          }
        />
        <KPI
          title={t("analytics.avgDailyExpense")}
          value={formatEuro(s.avg_daily_expense)}
          icon={Calendar}
          footnote={`${t("analytics.necessary")}: ${(s.necessary_ratio * 100).toFixed(0)}%`}
        />
      </div>

      {data.monthly.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground text-base">{t("analytics.monthlyEvolution")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 19% 22%)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "hsl(215 16% 65%)", fontSize: 11 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: "hsl(215 16% 65%)", fontSize: 11 }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle()}
                    formatter={(v: number) => formatEuro(v)}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="income"
                    name={t("analytics.incomeSeries")}
                    stroke="hsl(152 70% 50%)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    name={t("analytics.expenseSeries")}
                    stroke="hsl(0 70% 60%)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    name={t("analytics.balanceSeries")}
                    stroke="hsl(210 80% 60%)"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-5 text-sm text-muted-foreground flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {t("analytics.noData")}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground text-base">{t("analytics.expenseByCategory")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={100}
                    paddingAngle={2}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle()}
                    formatter={(v: number) => formatEuro(v)}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11 }}
                    formatter={(v) => <span className="text-muted-foreground">{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-foreground text-base">{t("analytics.topCategories")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCategories} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 19% 22%)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: "hsl(215 16% 65%)", fontSize: 11 }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    tick={{ fill: "hsl(215 16% 65%)", fontSize: 10 }}
                    width={110}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle()}
                    formatter={(v: number) => formatEuro(v)}
                  />
                  <Bar dataKey="expense" fill="hsl(0 70% 60%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {yearKeys.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground text-base">{t("analytics.yearComparison")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.year_comparison.map((p) => ({
                      label: p.label.slice(0, 3),
                      ...p.values,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 19% 22%)" />
                    <XAxis dataKey="label" tick={{ fill: "hsl(215 16% 65%)", fontSize: 11 }} />
                    <YAxis
                      tick={{ fill: "hsl(215 16% 65%)", fontSize: 11 }}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle()}
                      formatter={(v: number) => formatEuro(v)}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {yearKeys.map((yk, i) => (
                      <Bar
                        key={yk}
                        dataKey={yk}
                        name={yk}
                        fill={PALETTE[i % PALETTE.length]}
                        radius={[3, 3, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-foreground text-base">{t("analytics.necessaryVsDiscretionary")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={necessarySplitData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(props) => {
                      const { name, percent } = props as { name?: string; percent?: number };
                      const pct = ((percent ?? 0) * 100).toFixed(0);
                      return `${name ?? ""} ${pct}%`;
                    }}
                  >
                    <Cell fill="hsl(152 70% 50%)" />
                    <Cell fill="hsl(30 90% 60%)" />
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle()}
                    formatter={(v: number) => formatEuro(v)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}