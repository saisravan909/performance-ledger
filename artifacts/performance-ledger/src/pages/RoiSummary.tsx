import { useGetRoiSummary, useGetRoiBreakdown } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { formatCurrency } from "@/lib/utils";
import { Download, AlertTriangle } from "lucide-react";
import { downloadCSV, downloadJSON } from "@/lib/export";

export default function RoiSummary() {
  const { data: summary, isLoading: isLoadingSummary, isError: isErrorSummary } = useGetRoiSummary();
  const { data: breakdown, isLoading: isLoadingBreakdown, isError: isErrorBreakdown } = useGetRoiBreakdown();

  function handleExportCSV() {
    const rows = (breakdown || []).map((r: any) => ({
      serviceId: r.serviceId,
      serviceName: r.serviceName,
      savingsUsd: r.savingsUsd,
      incidentsPrevented: r.incidentsPrevented,
      automationCoverage: r.automationCoverage,
      timeReductionHrs: r.timeReductionHrs,
    }));
    downloadCSV(rows, "roi-breakdown.csv");
  }

  function handleExportJSON() {
    downloadJSON({ summary, breakdown, exportedAt: new Date().toISOString() }, "roi-summary.json");
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">ROI Summary</h1>
          <p className="text-muted-foreground mt-2">
            Quantified business value from performance governance automation. Savings are estimated from
            incident prevention, reduced deployment cycle time, and eliminated manual remediation effort.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleExportCSV}
            disabled={!breakdown?.length}
            data-testid="btn-export-roi-csv"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleExportJSON}
            disabled={!summary}
            data-testid="btn-export-roi-json"
          >
            <Download className="w-4 h-4" />
            Export JSON
          </Button>
        </div>
      </div>

      {isErrorSummary && (
        <PageError message="Failed to load ROI summary. The API server may be unavailable." />
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Savings (YTD)"
          value={summary ? formatCurrency(summary.totalSavingsUsd) : undefined}
          isLoading={isLoadingSummary}
          valueClassName="text-teal-400"
          subtitle="Cumulative estimated cost avoidance year-to-date"
          testId="metric-total-savings"
        />
        <MetricCard
          title="Annualized Run Rate"
          value={summary ? formatCurrency(summary.annualizedSavingsUsd) : undefined}
          isLoading={isLoadingSummary}
          subtitle="Projected annual savings at current governance pace"
          testId="metric-annualized-savings"
        />
        <MetricCard
          title="Incidents Prevented"
          value={summary?.incidentsPrevented.toString()}
          isLoading={isLoadingSummary}
          subtitle="Production incidents avoided via automated gate blocks"
          testId="metric-incidents-prevented"
        />
        <MetricCard
          title="MTTR Reduction"
          value={summary ? `${summary.mttrReductionPct}%` : undefined}
          isLoading={isLoadingSummary}
          valueClassName="text-teal-400"
          subtitle="Reduction in mean time to recovery when incidents do occur"
          testId="metric-mttr-reduction"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Cumulative Savings Trend</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Month-over-month cumulative cost avoidance from blocked regressions and prevented incidents.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-[350px] w-full" />
            ) : isErrorSummary ? (
              <PageError message="Failed to load savings trend data." />
            ) : !summary?.savingsTrend?.length ? (
              <EmptyState message="No savings trend data available yet." />
            ) : (
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={summary.savingsTrend}
                    margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `$${v / 1000}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                      }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(v: number) => [formatCurrency(v), "Savings"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--chart-1))"
                      fillOpacity={1}
                      fill="url(#colorSavings)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Savings by Service</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Cost avoidance attributed per service. Reflects blocked regression value plus incident prevention.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingBreakdown ? (
              <Skeleton className="h-[350px] w-full" />
            ) : isErrorBreakdown ? (
              <PageError message="Failed to load ROI breakdown." />
            ) : !breakdown?.length ? (
              <EmptyState message="No per-service ROI data available." />
            ) : (
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={breakdown}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `$${v / 1000}k`}
                    />
                    <YAxis
                      dataKey="serviceName"
                      type="category"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={110}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                      }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(v: number) => [formatCurrency(v), "Savings"]}
                    />
                    <Bar
                      dataKey="savingsUsd"
                      fill="hsl(var(--chart-1))"
                      radius={[0, 4, 4, 0]}
                      barSize={24}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {breakdown && breakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Per-Service Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wide">
                    <th className="text-left py-3 pr-6">Service</th>
                    <th className="text-right py-3 pr-6">Savings (USD)</th>
                    <th className="text-right py-3 pr-6">Incidents Prevented</th>
                    <th className="text-right py-3 pr-6">Automation Coverage</th>
                    <th className="text-right py-3">Time Saved (hrs)</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.map((r: any) => (
                    <tr
                      key={r.serviceId}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                      data-testid={`roi-row-${r.serviceId}`}
                    >
                      <td className="py-3 pr-6 font-medium text-white">{r.serviceName}</td>
                      <td className="py-3 pr-6 text-right font-mono text-teal-400">
                        {formatCurrency(r.savingsUsd)}
                      </td>
                      <td className="py-3 pr-6 text-right font-mono">{r.incidentsPrevented}</td>
                      <td className="py-3 pr-6 text-right font-mono">{r.automationCoverage}%</td>
                      <td className="py-3 text-right font-mono">{r.timeReductionHrs}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  isLoading,
  valueClassName = "text-white",
  subtitle,
  testId,
}: {
  title: string;
  value?: string;
  isLoading: boolean;
  valueClassName?: string;
  subtitle?: string;
  testId: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p className={`text-3xl font-bold ${valueClassName}`} data-testid={testId}>
            {value ?? "—"}
          </p>
        )}
        {subtitle && !isLoading && (
          <p className="text-xs text-muted-foreground/60 mt-1.5 leading-tight">{subtitle}</p>
        )}
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

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">{message}</div>
  );
}
