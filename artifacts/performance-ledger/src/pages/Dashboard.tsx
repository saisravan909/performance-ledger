import { useGetDashboardSummary, useGetDebtTrend, useGetMissionReadiness } from "@workspace/api-client-react";
import { useGetContinuitySummary } from "@/lib/continuity-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getMissionReadinessColor, getGradeColor, getHealthScoreColor } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Download, AlertTriangle, ShieldAlert } from "lucide-react";
import { downloadJSON } from "@/lib/export";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary, isError: isErrorSummary } = useGetDashboardSummary();
  const { data: debtTrend, isLoading: isLoadingTrend, isError: isErrorTrend } = useGetDebtTrend();
  const { data: missionReadiness, isLoading: isLoadingReadiness, isError: isErrorReadiness } = useGetMissionReadiness();
  const { data: continuity, isLoading: isLoadingContinuity } = useGetContinuitySummary();

  function handleExport() {
    downloadJSON({ summary, missionReadiness, exportedAt: new Date().toISOString() }, "executive-summary.json");
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Executive Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Portfolio-level performance governance overview. Scores are computed from stability, regression frequency,
            test coverage, and benchmark signal reliability.
          </p>
        </div>
        <Button variant="outline" size="sm" className="flex-shrink-0 gap-2" onClick={handleExport} disabled={!summary} data-testid="btn-export-summary">
          <Download className="w-4 h-4" /> Export Summary
        </Button>
      </div>

      {isErrorSummary && <PageError message="Failed to load portfolio summary. The API server may be unavailable." />}

      {/* Performance KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard title="Total Services" value={summary?.totalServices} isLoading={isLoadingSummary} testId="metric-total-services" />
        <MetricCard title="Avg Health Score" value={summary?.avgHealthScore} isLoading={isLoadingSummary}
          valueClassName={summary ? getHealthScoreColor(summary.avgHealthScore) : ""}
          subtitle="0–100, higher is better" testId="metric-health-score" />
        <MetricCard title="Open Flaky Signals" value={summary?.totalFlakySignals} isLoading={isLoadingSummary}
          valueClassName={summary && summary.totalFlakySignals > 0 ? "text-amber-400" : "text-white"}
          subtitle="Active benchmarks requiring attention" testId="metric-flaky-signals" />
        <MetricCard title="Blocked Releases" value={summary?.blockedReleases} isLoading={isLoadingSummary}
          valueClassName={summary && summary.blockedReleases > 0 ? "text-red-400" : "text-teal-400"}
          subtitle="Gate failures blocking deployment" testId="metric-blocked-releases" />
      </div>

      {/* Continuity Ledger KPIs — amber identity */}
      <div className="relative overflow-hidden rounded-xl border border-amber-500/15 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent p-6">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-amber-500/60 via-orange-400/40 to-transparent" />
        <div className="flex items-center gap-3 mb-4">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <p className="text-xs font-bold uppercase tracking-widest text-amber-400/80">
            Filing Season Operational Continuity
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ContinuityRiskCard
            riskLevel={continuity?.filingSeasonContinuityRisk}
            riskScore={continuity?.continuityRiskScore}
            isLoading={isLoadingContinuity}
          />
          <ContinuityMetricCard
            title="Recovery Readiness Score"
            value={continuity?.recoveryReadinessScore}
            isLoading={isLoadingContinuity}
            valueClassName={
              continuity
                ? continuity.recoveryReadinessScore >= 80 ? "text-teal-400"
                : continuity.recoveryReadinessScore >= 60 ? "text-amber-400"
                : "text-red-400"
                : ""
            }
            subtitle="Portfolio avg · 0–100, higher is better"
            testId="metric-readiness-score"
          />
          <ContinuityMetricCard
            title="Manual Recoveries Required"
            value={continuity?.manualRecoveryRequired}
            isLoading={isLoadingContinuity}
            valueClassName={continuity && continuity.manualRecoveryRequired > 0 ? "text-red-400" : "text-teal-400"}
            subtitle="Services needing operator intervention"
            testId="metric-manual-recoveries"
          />
          <ContinuityMetricCard
            title="Failed Post-Reboot Checks"
            value={continuity?.failedPostRebootChecks}
            isLoading={isLoadingContinuity}
            valueClassName={continuity && continuity.failedPostRebootChecks > 0 ? "text-red-400" : "text-teal-400"}
            subtitle="Health checks FAILED or PARTIAL"
            testId="metric-failed-checks"
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Portfolio Debt Trend</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Aggregate technical debt score across all services over the past 30 days. Lower is better.
            </p>
          </CardHeader>
          <CardContent>
            {isLoadingTrend ? (
              <Skeleton className="h-[300px] w-full" />
            ) : isErrorTrend ? (
              <PageError message="Failed to load debt trend data." />
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={debtTrend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorDebt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(v: number) => [v.toFixed(1), "Debt Score"]}
                    />
                    <Area type="monotone" dataKey="value" stroke="hsl(var(--chart-4))" fillOpacity={1} fill="url(#colorDebt)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mission Readiness</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Real-time service posture. READY services meet all SLOs and have no blocked releases.
            </p>
          </CardHeader>
          <CardContent>
            {isLoadingReadiness ? (
              <div className="space-y-3">{[1,2,3,4,5,6].map(i=><Skeleton key={i} className="h-12 w-full"/>)}</div>
            ) : isErrorReadiness ? (
              <PageError message="Failed to load mission readiness data." />
            ) : !missionReadiness?.length ? (
              <p className="text-muted-foreground text-sm text-center py-8">No services found.</p>
            ) : (
              <div className="space-y-3">
                {missionReadiness.map((item: any) => (
                  <div key={item.serviceId}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50"
                    data-testid={`readiness-${item.serviceId}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className={`font-bold flex-shrink-0 ${getGradeColor(item.grade)}`}>
                        {item.grade || "N/A"}
                      </Badge>
                      <div className="text-sm font-medium text-white truncate">{item.serviceName}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <div className="flex items-center gap-1">
                        {item.trend === "UP"     && <TrendingUp className="w-3.5 h-3.5 text-teal-400" />}
                        {item.trend === "DOWN"   && <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
                        {item.trend === "STABLE" && <Minus className="w-3.5 h-3.5 text-gray-400" />}
                        <span className="text-xs text-muted-foreground font-mono">
                          {item.score != null ? Number(item.score).toFixed(1) : "-"}
                        </span>
                      </div>
                      <Badge variant="outline" className={`text-xs ${getMissionReadinessColor(item.readiness)}`}>
                        {item.readiness?.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── sub-components ──────────────────────────────────────────────────────────

function MetricCard({ title, value, isLoading, valueClassName = "", subtitle, testId }: {
  title: string; value?: number; isLoading: boolean;
  valueClassName?: string; subtitle?: string; testId: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
        {isLoading ? <Skeleton className="h-8 w-20" /> : (
          <p className={`text-3xl font-bold ${valueClassName}`} data-testid={testId}>{value ?? "—"}</p>
        )}
        {subtitle && !isLoading && <p className="text-xs text-muted-foreground/60 mt-1.5 leading-tight">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function ContinuityMetricCard({ title, value, isLoading, valueClassName = "", subtitle, testId }: {
  title: string; value?: number; isLoading: boolean;
  valueClassName?: string; subtitle?: string; testId: string;
}) {
  return (
    <Card className="border-amber-500/15 bg-card">
      <CardContent className="p-6">
        <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
        {isLoading ? <Skeleton className="h-8 w-20" /> : (
          <p className={`text-3xl font-bold ${valueClassName}`} data-testid={testId}>{value ?? "—"}</p>
        )}
        {subtitle && !isLoading && <p className="text-xs text-muted-foreground/60 mt-1.5 leading-tight">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function ContinuityRiskCard({ riskLevel, riskScore, isLoading }: {
  riskLevel?: string; riskScore?: number; isLoading: boolean;
}) {
  const scoreColor =
    riskLevel === "LOW"      ? "text-teal-400" :
    riskLevel === "MODERATE" ? "text-amber-400" :
    riskLevel === "HIGH"     ? "text-orange-400" :
    "text-red-400";

  const badgeColor =
    riskLevel === "LOW"      ? "text-teal-400 border-teal-500/20 bg-teal-500/10" :
    riskLevel === "MODERATE" ? "text-amber-400 border-amber-500/20 bg-amber-500/10" :
    riskLevel === "HIGH"     ? "text-orange-400 border-orange-500/20 bg-orange-500/10" :
    "text-red-400 border-red-500/20 bg-red-500/10";

  return (
    <Card className="border-amber-500/20 bg-card">
      <CardContent className="p-6">
        <p className="text-sm font-medium text-muted-foreground mb-2">Filing Season Continuity Risk</p>
        {isLoading ? <Skeleton className="h-8 w-24" /> : (
          <div className="flex items-center gap-3">
            <p className={`text-3xl font-bold ${scoreColor}`} data-testid="metric-continuity-risk">{riskScore ?? "—"}</p>
            {riskLevel && <Badge variant="outline" className={`text-xs ${badgeColor}`}>{riskLevel}</Badge>}
          </div>
        )}
        {!isLoading && <p className="text-xs text-muted-foreground/60 mt-1.5 leading-tight">Risk score · 0–100, lower is better</p>}
      </CardContent>
    </Card>
  );
}

function PageError({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-lg border border-red-500/20 bg-red-500/5">
      <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
      <div>
        <p className="text-sm font-medium text-red-400">Failed to load</p>
        <p className="text-xs text-muted-foreground mt-0.5">{message}</p>
      </div>
    </div>
  );
}
