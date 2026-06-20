import { useCallback, useEffect, useRef, useState } from "react";
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
  Sector,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SectorProps } from "recharts";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  AlertCircle,
  Maximize2,
  ChevronDown,
  Eye,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { FiltersBar } from "../components/FiltersBar";
import { api } from "../lib/api";
import type { Analytics, Category, MovementFilter } from "../lib/types";
import { formatEuro, formatEuroSigned, cn } from "../lib/utils";
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

function chartTooltipStyle(): React.CSSProperties {
  return {
    backgroundColor: "hsl(222 30% 12%)",
    border: "1px solid hsl(217 19% 22%)",
    borderRadius: 8,
    fontSize: 12,
    padding: "6px 10px",
    color: "hsl(0 0% 90%)",
  };
}

function chartLabelStyle(): React.CSSProperties {
  return { color: "hsl(0 0% 90%)", fontWeight: 500 };
}

function chartItemStyle(): React.CSSProperties {
  return { color: "hsl(0 0% 80%)" };
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

function PieActiveShape(props: SectorProps) {
  const {
    cx = 0,
    cy = 0,
    innerRadius = 0,
    outerRadius = 0,
    startAngle = 0,
    endAngle = 0,
    fill,
  } = props as SectorProps & { fill?: string };
  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius + 6}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
      style={{ filter: "brightness(1.15)", transition: "all 150ms ease-out" }}
    />
  );
}

type SeriesKind = "expense" | "income";

function CategoryFilter({
  options,
  palette,
  selected,
  setSelected,
  allLabel,
  selectedLabel,
  clearLabel,
}: {
  options: { name: string; value: number }[];
  palette: string[];
  selected: string[];
  setSelected: (v: string[]) => void;
  allLabel: string;
  selectedLabel: string;
  clearLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      setTimeout(() => {
        if (!containerRef.current) return;
        const target = e.target as Node;
        if (document.contains(target) && !containerRef.current.contains(target)) {
          setOpen(false);
        }
      }, 0);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [open]);

  return (
    <div className="mb-2 relative" ref={containerRef}>
      <Button
        type="button"
        variant="outline"
        className="h-7 justify-between px-2 font-normal text-xs"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="truncate">
          {selected.length === options.length ? allLabel : `${selected.length} ${selectedLabel}`}
        </span>
        <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
      </Button>
      {open && (
        <div className="absolute z-20 mt-1 max-h-48 min-w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
          {options.map((d, i) => {
            const optionId = `cat-${d.name.replace(/\s+/g, "-")}`;
            return (
              <Label
                key={d.name}
                htmlFor={optionId}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-xs hover:bg-accent"
              >
                <Checkbox
                  id={optionId}
                  checked={selected.includes(d.name)}
                  onCheckedChange={() =>
                    setSelected(
                      selected.includes(d.name)
                        ? selected.filter((c) => c !== d.name)
                        : [...selected, d.name],
                    )
                  }
                />
                <span
                  className="inline-block w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: palette[i % palette.length] }}
                />
                <span className="truncate">{d.name}</span>
              </Label>
            );
          })}
          {selected.length < options.length && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs mt-1"
              onClick={() => setSelected(options.map((o) => o.name))}
            >
              <Eye className="h-3 w-3" />
              {clearLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState<MovementFilter>(() => {
    try {
      const stored = sessionStorage.getItem("movements-filter");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    sessionStorage.setItem("movements-filter", JSON.stringify(filter));
  }, [filter]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  const [visibleLines, setVisibleLines] = useState({ income: true, expense: true, balance: true });
  const [pieKind, setPieKind] = useState<SeriesKind>("expense");
  const [pieActiveIndex, setPieActiveIndex] = useState<number>(-1);
  const [selectedPieCats, setSelectedPieCats] = useState<string[]>([]);
  const [topKind, setTopKind] = useState<SeriesKind>("expense");
  const [selectedTopCats, setSelectedTopCats] = useState<string[]>([]);
  const [topActiveIndex, setTopActiveIndex] = useState<number>(-1);
  const [modalPieHover, setModalPieHover] = useState<number>(-1);
  const [fullChartModal, setFullChartModal] = useState<"top" | "pie" | null>(null);

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

  // Initialize selected categories with all names once data loads or kind changes
  const rawPieNames = data?.categories
    .filter((c) => (pieKind === "expense" ? c.expense : c.income) > 0)
    .map((c) => c.category) ?? [];
  const topNames = data?.categories
    .filter((c) => (topKind === "expense" ? c.expense : c.income) > 0)
    .map((c) => c.category) ?? [];

  useEffect(() => {
    if (rawPieNames.length > 0) setSelectedPieCats([...rawPieNames]);
  }, [pieKind, data]);

  useEffect(() => {
    if (topNames.length > 0) setSelectedTopCats([...topNames]);
  }, [topKind, data]);

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
  const allCategories = data.categories;

  // Pie chart data
  const rawPieData = allCategories
    .map((c) => ({
      name: c.category,
      value: Math.round((pieKind === "expense" ? c.expense : c.income) * 100) / 100,
    }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const pieData = rawPieData.filter((d) => selectedPieCats.includes(d.name));

  // Top categories
  const topAllData = [...allCategories]
    .sort((a, b) => {
      const aVal = topKind === "expense" ? a.expense : a.income;
      const bVal = topKind === "expense" ? b.expense : b.income;
      return bVal - aVal;
    })
    .filter((c) => (topKind === "expense" ? c.expense : c.income) > 0);

  const topRawChartData = topAllData.map((c) => ({
    category: c.category,
    value: Math.round((topKind === "expense" ? c.expense : c.income) * 100) / 100,
  }));

  const topChartData = topRawChartData
    .filter((d) => selectedTopCats.includes(d.category))
    .slice(0, 10);

  const yearKeys = Array.from(
    new Set(data.year_comparison.flatMap((p) => Object.keys(p.values))),
  ).sort();

  const necessarySplitData = [
    { name: t("analytics.necessary"), value: Math.round(data.necessary_split.necessary * 100) / 100 },
    { name: t("analytics.discretionary"), value: Math.round(data.necessary_split.discretionary * 100) / 100 },
  ];

  const lineToggle = (key: keyof typeof visibleLines, color: string) => (
    <button
      type="button"
      onClick={() => setVisibleLines((prev) => ({ ...prev, [key]: !prev[key] }))}
      className={cn(
        "inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-colors",
        visibleLines[key]
          ? "bg-accent text-accent-foreground"
          : "bg-transparent text-muted-foreground opacity-50",
      )}
    >
      <Eye className="h-3 w-3" />
      <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      {t(`analytics.${key === "income" ? "incomeSeries" : key === "expense" ? "expenseSeries" : "balanceSeries"}`)}
    </button>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t("analytics.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("analytics.subtitle")}</p>
      </div>

      <FiltersBar filter={filter} onChange={setFilter} categories={categories} years={data.years} />

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        <KPI title={t("analytics.balance")} value={formatEuroSigned(s.balance)} icon={Wallet} tone={s.balance >= 0 ? "positive" : "negative"} footnote={`${s.count} ${t("analytics.movements")}`} />
        <KPI title={t("analytics.income")} value={formatEuro(s.income_total)} icon={TrendingUp} tone="positive" />
        <KPI title={t("analytics.expense")} value={formatEuro(s.expense_total)} icon={TrendingDown} tone="negative" footnote={s.max_expense_category ? `${t("analytics.highest")} ${formatEuro(s.max_expense)} (${s.max_expense_category})` : undefined} />
        <KPI title={t("analytics.avgDailyExpense")} value={formatEuro(s.avg_daily_expense)} icon={Calendar} footnote={`${t("analytics.necessary")}: ${(s.necessary_ratio * 100).toFixed(0)}%`} />
        <KPI title={t("analytics.avgDailyBalance")} value={formatEuroSigned(s.avg_daily_balance)} icon={Activity} tone={s.avg_daily_balance >= 0 ? "positive" : "negative"} />
      </div>

      {data.monthly.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-foreground text-base">{t("analytics.monthlyEvolution")}</CardTitle>
              <div className="flex items-center gap-1">
                {lineToggle("income", "hsl(152 70% 50%)")}
                {lineToggle("expense", "hsl(0 70% 60%)")}
                {lineToggle("balance", "hsl(210 80% 60%)")}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 19% 22%)" />
                  <XAxis dataKey="label" tick={{ fill: "hsl(215 16% 65%)", fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: "hsl(215 16% 65%)", fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={chartTooltipStyle()} labelStyle={chartLabelStyle()} itemStyle={chartItemStyle()} formatter={(v: number) => formatEuro(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {visibleLines.income && (
                    <Line type="monotone" dataKey="income" name={t("analytics.incomeSeries")} stroke="hsl(152 70% 50%)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  )}
                  {visibleLines.expense && (
                    <Line type="monotone" dataKey="expense" name={t("analytics.expenseSeries")} stroke="hsl(0 70% 60%)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  )}
                  {visibleLines.balance && (
                    <Line type="monotone" dataKey="balance" name={t("analytics.balanceSeries")} stroke="hsl(210 80% 60%)" strokeWidth={2} strokeDasharray="4 4" dot={false} activeDot={{ r: 4 }} />
                  )}
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
        {/* Pie chart — expense/income by category */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-foreground text-base">
                {t(pieKind === "expense" ? "analytics.expenseByCategory" : "analytics.incomeByCategory")}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Tabs value={pieKind} onValueChange={(v) => setPieKind(v as SeriesKind)}>
                  <TabsList>
                    <TabsTrigger value="expense">{t("filter.expense")}</TabsTrigger>
                    <TabsTrigger value="income">{t("filter.income")}</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFullChartModal("pie")}>
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CategoryFilter
              options={rawPieData}
              palette={PALETTE}
              selected={selectedPieCats}
              setSelected={setSelectedPieCats}
              allLabel={t("filter.allF")}
              selectedLabel={t("filter.selected")}
              clearLabel={t("filter.selectAll")}
            />
            <div className="h-72">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={95}
                      paddingAngle={2}
                      isAnimationActive={false}
                      activeIndex={pieActiveIndex}
                      activeShape={PieActiveShape}
                      onMouseEnter={(_, idx) => setPieActiveIndex(idx)}
                      onMouseLeave={() => setPieActiveIndex(-1)}
                      onClick={() => {}}
                      style={{ cursor: "pointer" }}
                    >
                      {pieData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={PALETTE[i % PALETTE.length]}
                          style={{
                            filter: pieActiveIndex === -1 || pieActiveIndex === i ? undefined : "brightness(0.7)",
                            transition: "filter 150ms ease-out",
                          }}
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={chartTooltipStyle()} labelStyle={chartLabelStyle()} itemStyle={chartItemStyle()} formatter={(v: number) => formatEuro(v)} />
                    <Legend wrapperStyle={{ fontSize: 10 }} onClick={() => {}} formatter={(v) => <span className="text-muted-foreground">{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">{t("analytics.noData")}</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top categories bar chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-foreground text-base">{t("analytics.topCategories")}</CardTitle>
              <div className="flex items-center gap-2">
                <Tabs value={topKind} onValueChange={(v) => setTopKind(v as SeriesKind)}>
                  <TabsList>
                    <TabsTrigger value="expense">{t("filter.expense")}</TabsTrigger>
                    <TabsTrigger value="income">{t("filter.income")}</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFullChartModal("top")}>
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CategoryFilter
              options={topRawChartData.map((d) => ({ name: d.category, value: d.value }))}
              palette={PALETTE}
              selected={selectedTopCats}
              setSelected={setSelectedTopCats}
              allLabel={t("filter.allF")}
              selectedLabel={t("filter.selected")}
              clearLabel={t("filter.selectAll")}
            />
            <div
              className="h-72"
              onMouseMove={(e) => {
                if (topChartData.length === 0) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const y = e.clientY - rect.top;
                const idx = Math.floor(y / (rect.height / topChartData.length));
                setTopActiveIndex(idx >= 0 && idx < topChartData.length ? idx : -1);
              }}
              onMouseLeave={() => setTopActiveIndex(-1)}
            >
              {topChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topChartData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 19% 22%)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "hsl(215 16% 65%)", fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="category" tick={{ fill: "hsl(215 16% 65%)", fontSize: 10 }} width={110} />
                    <Tooltip contentStyle={chartTooltipStyle()} labelStyle={chartLabelStyle()} itemStyle={chartItemStyle()} formatter={(v: number) => formatEuro(v)} />
                    <Bar
                      dataKey="value"
                      name={topKind === "expense" ? t("analytics.expenseSeries") : t("analytics.incomeSeries")}
                      radius={[0, 4, 4, 0]}
                      style={{ cursor: "pointer" }}
                    >
                      {topChartData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={topKind === "expense" ? "hsl(0 70% 60%)" : "hsl(152 70% 50%)"}
                          style={{
                            filter: topActiveIndex === -1 || topActiveIndex === i ? undefined : "brightness(0.7)",
                            transition: "filter 150ms ease-out",
                          }}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">{t("analytics.noData")}</div>
              )}
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
                  <BarChart data={data.year_comparison.map((p) => ({ label: p.label.slice(0, 3), ...p.values }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 19% 22%)" />
                    <XAxis dataKey="label" tick={{ fill: "hsl(215 16% 65%)", fontSize: 11 }} />
                    <YAxis tick={{ fill: "hsl(215 16% 65%)", fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={chartTooltipStyle()} labelStyle={chartLabelStyle()} itemStyle={chartItemStyle()} formatter={(v: number) => formatEuro(v)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {yearKeys.map((yk, i) => (
                      <Bar key={yk} dataKey={yk} name={yk} fill={PALETTE[i % PALETTE.length]} radius={[3, 3, 0, 0]} style={{ cursor: "pointer" }} />
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
                    isAnimationActive={false}
                    activeIndex={pieActiveIndex < 0 ? undefined : pieActiveIndex}
                    activeShape={PieActiveShape}
                    onMouseEnter={(_, idx) => setPieActiveIndex(idx)}
                    onMouseLeave={() => setPieActiveIndex(-1)}
                    onClick={() => {}}
                    style={{ cursor: "pointer" }}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    <Cell fill="hsl(152 70% 50%)" style={{ filter: pieActiveIndex === -1 || pieActiveIndex === 0 ? undefined : "brightness(0.7)", transition: "filter 150ms ease-out" }} />
                    <Cell fill="hsl(30 90% 60%)" style={{ filter: pieActiveIndex === -1 || pieActiveIndex === 1 ? undefined : "brightness(0.7)", transition: "filter 150ms ease-out" }} />
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle()} labelStyle={chartLabelStyle()} itemStyle={chartItemStyle()} formatter={(v: number) => formatEuro(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full-screen top categories modal */}
      <Dialog open={fullChartModal === "top"} onOpenChange={(open) => !open && setFullChartModal(null)}>
        <DialogContent className="max-w-[95vw] h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle>{t("analytics.topCategories")}</DialogTitle>
              <Tabs value={topKind} onValueChange={(v) => setTopKind(v as SeriesKind)}>
                <TabsList>
                  <TabsTrigger value="expense">{t("filter.expense")}</TabsTrigger>
                  <TabsTrigger value="income">{t("filter.income")}</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </DialogHeader>
          <div className="px-6">
            <CategoryFilter
              options={topRawChartData.map((d) => ({ name: d.category, value: d.value }))}
              palette={PALETTE}
              selected={selectedTopCats}
              setSelected={setSelectedTopCats}
              allLabel={t("filter.allF")}
              selectedLabel={t("filter.selected")}
              clearLabel={t("filter.selectAll")}
            />
          </div>
          <div
            className="flex-1 min-h-0 px-6 pb-6"
            onMouseMove={(e) => {
              const filteredData = topRawChartData.filter((d) => selectedTopCats.includes(d.category));
              if (filteredData.length === 0) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const y = e.clientY - rect.top;
              const idx = Math.floor(y / (rect.height / filteredData.length));
              setTopActiveIndex(idx >= 0 && idx < filteredData.length ? idx : -1);
            }}
            onMouseLeave={() => setTopActiveIndex(-1)}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topRawChartData.filter((d) => selectedTopCats.includes(d.category))}
                layout="vertical"
                margin={{ left: 30, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 19% 22%)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "hsl(215 16% 65%)", fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="category" tick={{ fill: "hsl(215 16% 65%)", fontSize: 12 }} width={140} interval={0} />
                <Tooltip contentStyle={chartTooltipStyle()} labelStyle={chartLabelStyle()} itemStyle={chartItemStyle()} formatter={(v: number) => formatEuro(v)} />
                <Bar
                  dataKey="value"
                  name={topKind === "expense" ? t("analytics.expenseSeries") : t("analytics.incomeSeries")}
                  radius={[0, 4, 4, 0]}
                  style={{ cursor: "pointer" }}
                >
                  {topRawChartData.filter((d) => selectedTopCats.includes(d.category)).map((_, i) => (
                    <Cell
                      key={i}
                      fill={topKind === "expense" ? "hsl(0 70% 60%)" : "hsl(152 70% 50%)"}
                      style={{
                        filter: topActiveIndex === -1 || topActiveIndex === i ? undefined : "brightness(0.7)",
                        transition: "filter 150ms ease-out",
                      }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full-screen pie chart modal */}
      <Dialog open={fullChartModal === "pie"} onOpenChange={(open) => !open && setFullChartModal(null)}>
        <DialogContent className="max-w-[95vw] h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle>
                {t(pieKind === "expense" ? "analytics.expenseByCategory" : "analytics.incomeByCategory")}
              </DialogTitle>
              <Tabs value={pieKind} onValueChange={(v) => setPieKind(v as SeriesKind)}>
                <TabsList>
                  <TabsTrigger value="expense">{t("filter.expense")}</TabsTrigger>
                  <TabsTrigger value="income">{t("filter.income")}</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </DialogHeader>
          <div className="flex-1 min-h-0 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={rawPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={100}
                  outerRadius={220}
                  paddingAngle={2}
                  isAnimationActive={false}
                  onMouseEnter={(_, idx) => setModalPieHover(idx)}
                  onMouseLeave={() => setModalPieHover(-1)}
                  onClick={() => {}}
                  style={{ cursor: "pointer" }}
                  label={({ name, percent, cx: lCx, cy: lCy, midAngle, outerRadius: lOr }) => {
                    const RADIAN = Math.PI / 180;
                    const radius = (lOr as number) + 35;
                    const x = (lCx as number) + radius * Math.cos(-(midAngle as number) * RADIAN);
                    const y = (lCy as number) + radius * Math.sin(-(midAngle as number) * RADIAN);
                    const pct = ((percent ?? 0) * 100).toFixed(0);
                    return (
                      <text
                        x={x}
                        y={y}
                        fill="hsl(215 16% 65%)"
                        textAnchor={x > (lCx as number) ? "start" : "end"}
                        dominantBaseline="central"
                        fontSize={11}
                      >
                        {name} {pct}%
                      </text>
                    );
                  }}
                >
                  {rawPieData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={PALETTE[i % PALETTE.length]}
                      style={{
                        filter: modalPieHover === -1 || modalPieHover === i ? undefined : "brightness(0.7)",
                        transition: "filter 150ms ease-out",
                      }}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle()} labelStyle={chartLabelStyle()} itemStyle={chartItemStyle()} formatter={(v: number) => formatEuro(v)} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} onClick={() => {}} formatter={(v) => <span className="text-muted-foreground">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
