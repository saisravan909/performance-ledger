import { useParams } from "wouter";
import { useGetService, getGetServiceQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { getMissionReadinessColor, getDebtScoreColor, getHealthScoreColor, getSeverityColor, getGovernanceStatusColor, getGradeColor, getComponentScoreColor } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";


export default function ServiceDetail() {
  const params = useParams();
  const id = params.id as string;
  
  const { data: service, isLoading } = useGetService(id, {
    query: {
      enabled: !!id,
      queryKey: getGetServiceQueryKey(id)
    }
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        <Skeleton className="h-12 w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 p-6 rounded-lg border border-red-500/20 bg-red-500/5">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-400">Service not found</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              No service with ID "{id}" exists in the registry. Verify the service ID and try again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-white">{service.name}</h1>
            <Badge variant="outline" className={getMissionReadinessColor(service.missionReadiness)}>
              {service.missionReadiness.replace('_', ' ')}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-2">Owner: {service.owner || 'Unassigned'} • Tier: {service.tier.replace('_', ' ')}</p>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <div className="text-sm text-muted-foreground">Health Score</div>
            <div className={`text-2xl font-bold ${getHealthScoreColor(service.healthScore)}`}>{service.healthScore}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Debt Score</div>
            <div className={`text-2xl font-bold ${getDebtScoreColor(service.debtScore)}`}>{service.debtScore}</div>
          </div>
        </div>
      </div>

      {/* Performance Score Panel */}
      <Card className="bg-card/50 border-border shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
          {/* Left section - Score Summary */}
          <div className="p-6 flex flex-col items-center justify-center space-y-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Performance Score</div>
            <div className="flex items-baseline gap-4">
              <div className={`text-7xl font-bold ${getGradeColor(service.grade).split(' ')[0]}`}>{service.grade || "N/A"}</div>
              <div className="text-2xl font-medium text-muted-foreground">{service.score != null ? service.score.toFixed(1) : "-"} <span className="text-muted-foreground/50 text-xl">/ 100</span></div>
            </div>
            {service.scoreDelta != null && (
              <div className={`flex items-center gap-1.5 font-medium ${service.scoreDelta > 0 ? "text-teal-400" : service.scoreDelta < 0 ? "text-red-400" : "text-gray-400"}`}>
                {service.scoreDelta > 0 ? <TrendingUp className="w-4 h-4" /> : service.scoreDelta < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                {service.scoreDelta > 0 ? "+" : ""}{service.scoreDelta.toFixed(1)} pts
              </div>
            )}
          </div>

          {/* Middle section - Component Breakdown */}
          <div className="p-6 space-y-5">
            <div className="text-sm font-semibold text-white">Score Components</div>
            <div className="space-y-4">
              {[
                { label: "Stability", value: (service as any).scoreComponents?.stability, weight: "25%" },
                { label: "Regression Frequency", value: (service as any).scoreComponents?.regressionFrequency, weight: "20%" },
                { label: "Regression Severity", value: (service as any).scoreComponents?.regressionSeverity, weight: "20%" },
                { label: "Trend", value: (service as any).scoreComponents?.trend, weight: "15%" },
                { label: "Test Coverage", value: (service as any).scoreComponents?.testCoverage, weight: "10%" },
                { label: "Signal Reliability", value: (service as any).scoreComponents?.signalReliability, weight: "10%" },
              ].map((comp, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{comp.label} <span className="text-muted-foreground/40">({comp.weight})</span></span>
                    <span className="font-medium text-white">{comp.value ?? "-"}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${comp.value !== undefined ? getComponentScoreColor(comp.value) : "bg-muted"}`}
                      style={{ width: `${comp.value || 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right section - Drivers & Action */}
          <div className="p-6 flex flex-col h-full space-y-4">
            <div className="text-sm font-semibold text-white">Score Drivers</div>
            <div className="flex-1 space-y-4">
              {(service as any).scoreDrivers?.slice(0, 4).map((driver: any, idx: number) => (
                <div key={idx} className="flex gap-3 items-start">
                  <Badge variant="outline" className={`mt-0.5 text-[10px] px-1.5 py-0 border-0 ${
                    driver.impact === 'HIGH' ? 'bg-red-500/10 text-red-400' :
                    driver.impact === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400' :
                    'bg-blue-500/10 text-blue-400'
                  }`}>
                    {driver.impact}
                  </Badge>
                  <div className="space-y-0.5 flex-1 leading-tight">
                    <div className="text-xs font-semibold text-white">{driver.component}</div>
                    <div className="text-xs text-muted-foreground">{driver.label}</div>
                    <div className="text-[10px] text-muted-foreground/60">{driver.detail}</div>
                  </div>
                </div>
              ))}
            </div>
            {(service as any).recommendedAction && (
              <div className="mt-4 p-4 bg-teal-500/5 border border-teal-500/10 rounded-lg">
                <div className="text-[10px] font-bold text-teal-400 uppercase tracking-wider mb-1.5">Action</div>
                <div className="text-xs text-teal-100/90 leading-relaxed">{(service as any).recommendedAction}</div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Latency & Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard title="P50 Latency" value={service.p50Latency ? `${service.p50Latency}ms` : 'N/A'} testId="metric-p50" />
        <MetricCard title="P95 Latency" value={service.p95Latency ? `${service.p95Latency}ms` : 'N/A'} testId="metric-p95" />
        <MetricCard title="Error Rate" value={service.errorRate ? `${service.errorRate.toFixed(2)}%` : 'N/A'} testId="metric-error-rate" />
        <MetricCard title="Throughput" value={service.throughput ? `${service.throughput} req/s` : 'N/A'} testId="metric-throughput" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Latency Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={service.latencyTrend || []} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} itemStyle={{ color: "hsl(var(--foreground))" }} />
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Debt History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={service.debtHistory || []} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorDebtDetail" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} itemStyle={{ color: "hsl(var(--foreground))" }} />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--chart-4))" fillOpacity={1} fill="url(#colorDebtDetail)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Flaky Signals */}
      {service.flakySignals && service.flakySignals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Flaky Signals</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Benchmark</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {service.flakySignals.map((signal) => (
                  <TableRow key={signal.id}>
                    <TableCell className="font-medium">{signal.benchmark}</TableCell>
                    <TableCell><Badge variant="outline" className={getSeverityColor(signal.severity)}>{signal.severity}</Badge></TableCell>
                    <TableCell>{signal.flakinessScore}</TableCell>
                    <TableCell className="text-muted-foreground">{signal.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Recent Releases */}
      {service.recentReleases && service.recentReleases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Releases</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Debt Score @ Release</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {service.recentReleases.map((release) => (
                  <TableRow key={release.id}>
                    <TableCell className="font-medium text-white">{release.version}</TableCell>
                    <TableCell><Badge variant="outline" className={getGovernanceStatusColor(release.governanceStatus)}>{release.governanceStatus}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{new Date(release.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className={`text-right font-medium ${release.debtScoreAtRelease !== undefined ? getDebtScoreColor(release.debtScoreAtRelease) : ''}`}>
                      {release.debtScoreAtRelease ?? '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

    </div>
  );
}

function MetricCard({ title, value, testId }: { title: string, value: string, testId: string }) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
        <p className="text-2xl font-bold text-white" data-testid={testId}>{value}</p>
      </CardContent>
    </Card>
  );
}
