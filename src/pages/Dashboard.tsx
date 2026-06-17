import { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  BarChart3,
  CalendarRange,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { api } from "../lib/api";
import type { Analytics } from "../lib/types";
import { formatEuro, formatEuroSigned } from "../lib/utils";
import { useLanguage } from "../lib/i18n";

function KPICard({
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
    tone === "positive"
      ? "text-success"
      : tone === "negative"
      ? "text-danger"
      : "text-foreground";
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

export function DashboardPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError(null);
    api
      .getAnalytics({})
      .then((a) => {
        if (!cancel) setData(a);
      })
      .catch((e) => {
        if (!cancel) {
          setData(null);
          setError(String(e));
        }
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, []);

  if (loading) {
    return <div className="text-sm text-muted-foreground">{t("dashboard.loading")}</div>;
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="pt-5 text-sm text-muted-foreground flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 text-danger" />
          <div>
            <div className="font-medium text-foreground">{t("dashboard.errorTitle")}</div>
            {error && <div className="mt-1">{error}</div>}
          </div>
        </CardContent>
      </Card>
    );
  }

  const s = data.summary;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t("dashboard.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("dashboard.subtitle")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title={t("dashboard.totalBalance")}
          value={formatEuroSigned(s.balance)}
          icon={Wallet}
          tone={s.balance >= 0 ? "positive" : "negative"}
        />
        <KPICard
          title={t("dashboard.income")}
          value={formatEuro(s.income_total)}
          icon={TrendingUp}
          tone="positive"
          footnote={`${s.count} ${t("dashboard.movements")}`}
        />
        <KPICard
          title={t("dashboard.expenses")}
          value={formatEuro(s.expense_total)}
          icon={TrendingDown}
          tone="negative"
          footnote={`${t("dashboard.highest")} ${formatEuro(s.max_expense)}`}
        />
        <KPICard
          title={t("dashboard.avgDaily")}
          value={formatEuro(s.avg_daily_expense)}
          icon={CalendarRange}
          footnote={`${t("dashboard.necessary")}: ${(s.necessary_ratio * 100).toFixed(0)}%`}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground text-base">{t("dashboard.recentMonths")}</CardTitle>
              <p className="text-xs text-muted-foreground">{t("dashboard.recentMonthsDesc")}</p>
            </div>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            {data.monthly.slice(-6).map((m) => (
              <div
                key={`${m.year}-${m.month}`}
                className="flex items-center justify-between text-sm py-2 border-b last:border-0"
              >
                <div className="font-medium">{m.label}</div>
                <div className="flex items-center gap-6 num">
                  <span className="text-success">{formatEuro(m.income)}</span>
                  <span className="text-danger">−{formatEuro(m.expense)}</span>
                  <span
                    className={`font-semibold w-24 text-right ${
                      m.balance >= 0 ? "text-success" : "text-danger"
                    }`}
                  >
                    {formatEuroSigned(m.balance)}
                  </span>
                </div>
              </div>
            ))}
            {data.monthly.length === 0 && (
              <div className="text-sm text-muted-foreground">{t("dashboard.noMovements")}</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}