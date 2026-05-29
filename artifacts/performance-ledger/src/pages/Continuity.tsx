import { useGetContinuitySummary } from "@/lib/continuity-api";
import type { RebootEvent, ServiceReadiness, OperationalEvent, EvidencePacket } from "@/lib/continuity-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  RefreshCw,
  ShieldAlert,
  Zap,
  Users,
  Database,
  Layers,
  Activity,
  TrendingUp,
  FileText,
  Info,
} from "lucide-react";
import { downloadJSON, downloadCSV } from "@/lib/export";

// ─── colour helpers ──────────────────────────────────────────────────────────

function riskColor(risk: string) {
  switch (risk) {
    case "LOW":      return "bg-teal-500/10 text-teal-400 border-teal-500/20";
    case "MODERATE": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "HIGH":     return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    case "CRITICAL": return "bg-red-500/10 text-red-400 border-red-500/20";
    default:         return "bg-gray-500/10 text-gray-400 border-gray-500/20";
  }
}

function riskBanner(risk: string) {
  switch (risk) {
    case "LOW":      return "border-teal-500/30 bg-teal-500/5";
    case "MODERATE": return "border-amber-500/30 bg-amber-500/5";
    case "HIGH":     return "border-orange-500/30 bg-orange-500/5";
    case "CRITICAL": return "border-red-500/30 bg-red-500/5";
    default:         return "border-gray-500/30 bg-gray-500/5";
  }
}

function readinessColor(score: number) {
  if (score >= 75) return "text-teal-400";
  if (score >= 55) return "text-amber-400";
  if (score >= 35) return "text-orange-400";
  return "text-red-400";
}

function readinessBar(score: number) {
  if (score >= 75) return "bg-teal-500";
  if (score >= 55) return "bg-amber-500";
  if (score >= 35) return "bg-orange-500";
  return "bg-red-500";
}

function healthCheckColor(status: string) {
  switch (status) {
    case "PASSED":  return "text-teal-400";
    case "PARTIAL": return "text-amber-400";
    case "FAILED":  return "text-red-400";
    default:        return "text-gray-400";
  }
}

function severityColor(severity: string) {
  switch (severity) {
    case "LOW":      return "text-teal-400 border-teal-500/20 bg-teal-500/10";
    case "MODERATE": return "text-amber-400 border-amber-500/20 bg-amber-500/10";
    case "HIGH":     return "text-orange-400 border-orange-500/20 bg-orange-500/10";
    case "CRITICAL": return "text-red-400 border-red-500/20 bg-red-500/10";
    default:         return "text-gray-400 border-gray-500/20 bg-gray-500/10";
  }
}

function decisionColor(decision: string) {
  switch (decision) {
    case "ALLOWED":    return "text-teal-400 border-teal-500/20 bg-teal-500/10";
    case "WARNED":     return "text-amber-400 border-amber-500/20 bg-amber-500/10";
    case "BLOCKED":    return "text-red-400 border-red-500/20 bg-red-500/10";
    case "OVERRIDDEN": return "text-purple-400 border-purple-500/20 bg-purple-500/10";
    default:           return "text-gray-400 border-gray-500/20 bg-gray-500/10";
  }
}

function rebootCauseLabel(cause: string) {
  const map: Record<string, string> = {
    OOM_KILL:             "OOM Kill",
    KERNEL_PANIC:         "Kernel Panic",
    HEALTH_CHECK_FAILURE: "Health Check Failure",
    DEPENDENCY_TIMEOUT:   "Dependency Timeout",
    DEPLOYMENT_ROLLBACK:  "Deployment Rollback",
    MANUAL_RESTART:       "Manual Restart",
  };
  return map[cause] ?? cause;
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function riskExplanation(
  risk: string, score: number, manual: number, failed: number, reboots: number,
): string {
  if (risk === "LOW")
    return `Portfolio continuity risk is LOW (score ${score}/100). All critical services maintain automated restart policies, health check coverage, and sub-5-minute MTTR. No manual recovery interventions were required during the filing season window.`;
  if (risk === "MODERATE") {
    const parts = [`Portfolio continuity risk is MODERATE (score ${score}/100).`];
    if (manual > 0) parts.push(`${manual} service${manual > 1 ? "s" : ""} required manual operator intervention.`);
    if (failed > 0) parts.push(`${failed} post-reboot health check${failed > 1 ? "s" : ""} returned FAILED or PARTIAL status.`);
    parts.push("Implementing the recommended actions below would reduce this to LOW risk before the next filing window.");
    return parts.join(" ");
  }
  if (risk === "HIGH")
    return `Portfolio continuity risk is HIGH (score ${score}/100). ${reboots} reboot events occurred across impacted services. ${manual > 0 ? `${manual} service${manual > 1 ? "s" : ""} required manual recovery. ` : ""}${failed} post-reboot health checks failed or returned partial status — traffic was routed to unhealthy instances. Immediate remediation is required before peak filing season.`;
  return `Portfolio continuity risk is CRITICAL (score ${score}/100). The current recovery posture cannot sustain filing-season incident rates without significant operator escalation. ${manual} service${manual > 1 ? "s" : ""} require manual intervention for every restart. Leadership action is required to fund the automation programme outlined below.`;
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function Continuity() {
  const { data, isLoading, isError } = useGetContinuitySummary();

  function handleExportJSON() { downloadJSON(data, "continuity-summary.json"); }
  function handleExportCSV() {
    if (!data) return;
    downloadCSV(
      data.continuityTimeline.map((e: RebootEvent) => ({
        id: e.id, service: e.serviceName, timestamp: e.timestamp,
        cause: e.rebootCause, recoveryType: e.recoveryType,
        recoveryTimeMinutes: e.recoveryTimeMinutes,
        healthCheckStatus: e.healthCheckStatus,
        smokePassed: e.postRebootSmokePassed,
        affectedUsers: e.affectedUsers, region: e.region,
      })),
      "reboot-events.csv",
    );
  }

  const level = data?.filingSeasonContinuityRisk ?? "";

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">

      {/* ── Branded header ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/8 via-transparent to-transparent">
        {/* amber top bar */}
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-500 via-orange-400 to-transparent" />

        <div className="p-8">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-5">
              {/* icon lockup */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex-shrink-0">
                <ShieldAlert className="w-8 h-8 text-amber-400" />
              </div>

              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-xs font-bold uppercase tracking-widest text-amber-400/70">
                    Operational Resilience Governance
                  </span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-white">
                  Continuity Ledger
                </h1>
                <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
                  Filing-season resilience governance for mission-critical services. Tracks service
                  restart events, manual recovery dependency, post-reboot health check outcomes,
                  queue backlog pressure, database pool exhaustion, cache cold starts, and
                  autoscaling lag — with tamper-evident audit evidence for every event.
                </p>
              </div>
            </div>

            <div className="flex gap-2 flex-shrink-0 pt-1">
              <Button variant="outline" size="sm" className="gap-2 border-amber-500/20 hover:border-amber-500/40 hover:text-amber-400" onClick={handleExportCSV} disabled={!data}>
                <Download className="w-4 h-4" /> Export Events
              </Button>
              <Button variant="outline" size="sm" className="gap-2 border-amber-500/20 hover:border-amber-500/40 hover:text-amber-400" onClick={handleExportJSON} disabled={!data}>
                <Download className="w-4 h-4" /> Export Summary
              </Button>
            </div>
          </div>
        </div>
      </div>

      {isError && <PageError message="Failed to load continuity data. The API server may be unavailable." />}

      {/* ── Risk banner ────────────────────────────────────────────────── */}
      {isLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : data ? (
        <div className={`flex items-center gap-4 p-4 rounded-lg border ${riskBanner(level)}`}>
          <ShieldAlert className="w-6 h-6 flex-shrink-0 opacity-80" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-semibold text-white">Filing Season Continuity Risk</span>
              <Badge variant="outline" className={riskColor(level)}>{level}</Badge>
              <span className="text-xs text-muted-foreground">
                Risk Score:{" "}
                <span className="font-semibold text-white">{data.continuityRiskScore}/100</span>
                {" · "}Recovery Readiness:{" "}
                <span className={`font-semibold ${readinessColor(data.recoveryReadinessScore)}`}>
                  {data.recoveryReadinessScore}/100
                </span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {data.manualRecoveryRequired > 0 && (
                <span className="text-orange-400">
                  {data.manualRecoveryRequired} service{data.manualRecoveryRequired > 1 ? "s" : ""} require manual operator intervention.{" "}
                </span>
              )}
              {data.manualRecoveryRequired === 0 && (
                <span className="text-teal-400">All services support automated recovery. </span>
              )}
              {data.failedPostRebootChecks > 0 && (
                <span className="text-red-400">
                  {data.failedPostRebootChecks} post-reboot health check{data.failedPostRebootChecks > 1 ? "s" : ""} returned FAILED or PARTIAL status.
                </span>
              )}
            </p>
          </div>
        </div>
      ) : null}

      {/* ── Reboot & Recovery KPIs ─────────────────────────────────────── */}
      <Section label="Reboot & Recovery">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard title="Reboot Events" value={data?.totalRebootEvents} isLoading={isLoading}
            icon={<RefreshCw className="w-4 h-4 text-muted-foreground" />} subtitle="Filing season total" />
          <KpiCard title="Affected Services" value={data?.servicesImpacted} isLoading={isLoading}
            icon={<ShieldAlert className="w-4 h-4 text-muted-foreground" />}
            valueClassName={data && data.servicesImpacted > 3 ? "text-orange-400" : "text-white"}
            subtitle="Experienced ≥1 reboot" />
          <KpiCard title="Auto-Recovered" value={data?.autoRecoveredServices} isLoading={isLoading}
            icon={<Zap className="w-4 h-4 text-muted-foreground" />}
            valueClassName="text-teal-400" subtitle="No operator needed" />
          <KpiCard title="Manual Recovery" value={data?.manualRecoveryRequired} isLoading={isLoading}
            icon={<Users className="w-4 h-4 text-muted-foreground" />}
            valueClassName={data && data.manualRecoveryRequired > 0 ? "text-red-400" : "text-teal-400"}
            subtitle="Required operator action" />
          <KpiCard title="Avg Recovery Time" value={data ? `${data.averageRecoveryTimeMinutes}m` : undefined} isLoading={isLoading}
            icon={<Clock className="w-4 h-4 text-muted-foreground" />}
            valueClassName={data && data.averageRecoveryTimeMinutes > 15 ? "text-red-400" : data && data.averageRecoveryTimeMinutes > 5 ? "text-amber-400" : "text-teal-400"}
            subtitle="Target: < 5 minutes" isString />
          <KpiCard title="Failed Health Checks" value={data?.failedPostRebootChecks} isLoading={isLoading}
            icon={<AlertTriangle className="w-4 h-4 text-muted-foreground" />}
            valueClassName={data && data.failedPostRebootChecks > 0 ? "text-red-400" : "text-teal-400"}
            subtitle="Post-reboot FAILED or PARTIAL" />
        </div>
      </Section>

      {/* ── Operational Pressure KPIs ──────────────────────────────────── */}
      <Section label="Operational Pressure Events">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <KpiCard title="Queue Backlog Events" value={data?.queueBacklogEvents} isLoading={isLoading}
            icon={<Layers className="w-4 h-4 text-muted-foreground" />}
            valueClassName={data && data.queueBacklogEvents > 0 ? "text-orange-400" : "text-teal-400"}
            subtitle="Post-restart queue accumulation" />
          <KpiCard title="DB Pool Pressure" value={data?.databasePoolPressureEvents} isLoading={isLoading}
            icon={<Database className="w-4 h-4 text-muted-foreground" />}
            valueClassName={data && data.databasePoolPressureEvents > 0 ? "text-red-400" : "text-teal-400"}
            subtitle="Connection pool exhaustion" />
          <KpiCard title="Cache Cold Starts" value={data?.cacheColdStartEvents} isLoading={isLoading}
            icon={<Activity className="w-4 h-4 text-muted-foreground" />}
            valueClassName={data && data.cacheColdStartEvents > 0 ? "text-amber-400" : "text-teal-400"}
            subtitle="Unwarmed cache on restart" />
          <KpiCard title="Autoscaling Lag" value={data?.autoscalingLagEvents} isLoading={isLoading}
            icon={<TrendingUp className="w-4 h-4 text-muted-foreground" />}
            valueClassName={data && data.autoscalingLagEvents > 0 ? "text-amber-400" : "text-teal-400"}
            subtitle="HPA delayed scale-out" />
          <KpiCard title="Dependency Timeouts" value={data?.dependencyTimeoutEvents} isLoading={isLoading}
            icon={<Zap className="w-4 h-4 text-muted-foreground" />}
            valueClassName={data && data.dependencyTimeoutEvents > 0 ? "text-orange-400" : "text-teal-400"}
            subtitle="Restarts caused by dep. failure" />
        </div>
      </Section>

      {/* ── Timeline + Readiness ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <Card className="lg:col-span-3 border-amber-500/10">
          <CardHeader>
            <CardTitle>Reboot Event Timeline</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">All server restart events during the filing season window. Sorted by date.</p>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-6">{[1,2,3,4,5].map(i=><Skeleton key={i} className="h-12 w-full"/>)}</div>
            ) : isError ? <PageError message="Unable to load event timeline." /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["Service","Date","Cause","Type","MTTR","Health"].map((h,i)=>(
                        <th key={h} className={`px-${i===0?6:4} py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide ${i===4?"text-right":"text-left"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.continuityTimeline ?? []).map((ev: RebootEvent) => (
                      <tr key={ev.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                        <td className="px-6 py-3">
                          <span className="font-medium text-white text-xs truncate block max-w-[140px]" title={ev.serviceName}>{ev.serviceName}</span>
                          <span className="text-xs text-muted-foreground">{ev.region}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDateTime(ev.timestamp)}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{rebootCauseLabel(ev.rebootCause)}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`text-xs ${ev.recoveryType==="AUTO"?"text-teal-400 border-teal-500/20 bg-teal-500/10":"text-orange-400 border-orange-500/20 bg-orange-500/10"}`}>
                            {ev.recoveryType}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-xs font-mono font-semibold ${ev.recoveryTimeMinutes>30?"text-red-400":ev.recoveryTimeMinutes>10?"text-amber-400":"text-teal-400"}`}>
                            {ev.recoveryTimeMinutes}m
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className={`flex items-center gap-1.5 text-xs ${healthCheckColor(ev.healthCheckStatus)}`}>
                            {ev.healthCheckStatus==="PASSED"?<CheckCircle2 className="w-3.5 h-3.5"/>:<XCircle className="w-3.5 h-3.5"/>}
                            {ev.healthCheckStatus}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-amber-500/10">
          <CardHeader>
            <CardTitle>Recovery Readiness by Service</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Composite score based on automation coverage, health checks, and recovery speed.</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">{[1,2,3,4,5,6].map(i=><Skeleton key={i} className="h-14 w-full"/>)}</div>
            ) : isError ? <PageError message="Unable to load readiness data." /> : (
              <div className="space-y-4">
                {(data?.affectedServices ?? []).map((svc: ServiceReadiness) => (
                  <div key={svc.serviceId} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs flex-shrink-0 font-bold ${
                            svc.readiness.grade==="A"?"text-teal-400 border-teal-400/30 bg-teal-400/10":
                            svc.readiness.grade==="B"?"text-green-400 border-green-400/30 bg-green-400/10":
                            svc.readiness.grade==="C"?"text-amber-400 border-amber-400/30 bg-amber-400/10":
                            svc.readiness.grade==="D"?"text-orange-400 border-orange-400/30 bg-orange-400/10":
                            "text-red-400 border-red-400/30 bg-red-400/10"
                          }`}>{svc.readiness.grade}</Badge>
                          <span className="text-xs font-medium text-white truncate">{svc.serviceName}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={`text-xs ${riskColor(svc.readiness.riskLevel)}`}>{svc.readiness.riskLevel}</Badge>
                          {svc.factors.manualRecoveryRequired && (
                            <span className="text-xs text-red-400 flex items-center gap-0.5">
                              <AlertTriangle className="w-3 h-3"/> Manual
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`text-lg font-bold font-mono flex-shrink-0 ${readinessColor(svc.readiness.score)}`}>{svc.readiness.score}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full transition-all ${readinessBar(svc.readiness.score)}`} style={{width:`${svc.readiness.score}%`}}/>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Operational pressure detail ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <OperationalEventCard title="Queue Backlog Events"
          subtitle="Post-restart queue accumulation. Uncleared backlogs during cold-start windows cause SLO violations."
          events={data?.queueBacklogDetail??[]} isLoading={isLoading} icon={<Layers className="w-4 h-4 text-muted-foreground"/>}/>
        <OperationalEventCard title="Database Pool Pressure"
          subtitle="Connection pool exhaustion following restart. Saturated pools cascade 503 errors to downstream callers."
          events={data?.databasePoolDetail??[]} isLoading={isLoading} icon={<Database className="w-4 h-4 text-muted-foreground"/>}/>
        <OperationalEventCard title="Cache Cold Start Events"
          subtitle="Unwarmed cache states on restart. Cold caches drive latency spikes and throughput degradation."
          events={data?.cacheColdStartDetail??[]} isLoading={isLoading} icon={<Activity className="w-4 h-4 text-muted-foreground"/>}/>
        <OperationalEventCard title="Autoscaling Lag Events"
          subtitle="HPA delayed scale-out following restart. Inadequate replica warm-up causes throttling under load."
          events={data?.autoscalingLagDetail??[]} isLoading={isLoading} icon={<TrendingUp className="w-4 h-4 text-muted-foreground"/>}/>
      </div>

      {/* ── Automation recommendations + Service detail ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-amber-500/10">
          <CardHeader>
            <CardTitle>Recommended Automation Actions</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Prioritised interventions to improve recovery readiness and eliminate manual dependency.</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[1,2,3].map(i=><Skeleton key={i} className="h-16 w-full"/>)}</div>
            ) : (
              <div className="space-y-3">
                {(data?.automationRecommendations??[]).map((action:string, idx:number)=>(
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border border-amber-500/10 bg-amber-500/5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/15 text-amber-400 text-xs flex items-center justify-center font-bold mt-0.5">{idx+1}</span>
                    <p className="text-sm text-muted-foreground leading-snug">{action}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-amber-500/10">
          <CardHeader>
            <CardTitle>Service Continuity Detail</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Automation coverage flags and readiness gaps per service.</p>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-6">{[1,2,3].map(i=><Skeleton key={i} className="h-20 w-full"/>)}</div>
            ) : (
              <div className="divide-y divide-border">
                {(data?.affectedServices??[]).map((svc:ServiceReadiness)=>(
                  <div key={svc.serviceId} className="px-6 py-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-white">{svc.serviceName}</span>
                      <span className="text-xs text-muted-foreground">{svc.tier} · {svc.owner}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 mb-2">
                      {([ ["Auto-Restart",svc.factors.autoRestartConfigured],["Health Checks",svc.factors.healthChecksAvailable],["Smoke Tests",svc.factors.smokeTestsAvailable],["Dep. Checks",svc.factors.dependencyChecksAvailable],["Cache Warmup",svc.factors.cacheWarmupAvailable],["Auto Recovery",!svc.factors.manualRecoveryRequired] ] as [string,boolean][]).map(([label,ok])=>(
                        <div key={label} className="flex items-center gap-1 text-xs">
                          {ok?<CheckCircle2 className="w-3 h-3 text-teal-400 flex-shrink-0"/>:<XCircle className="w-3 h-3 text-red-400 flex-shrink-0"/>}
                          <span className={ok?"text-muted-foreground":"text-red-400/80"}>{label}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Avg recovery:{" "}
                      <span className={`font-semibold ${svc.factors.avgRecoveryTimeMinutes>15?"text-red-400":svc.factors.avgRecoveryTimeMinutes>5?"text-amber-400":"text-teal-400"}`}>
                        {svc.factors.avgRecoveryTimeMinutes}m
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Continuity Evidence Packets ────────────────────────────────── */}
      <Card className="border-amber-500/15">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400"/>
            <CardTitle>Continuity Evidence Packets</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Tamper-evident SHA-256 audit records for every reboot recovery event, evaluated against the Filing Season Continuity Policy.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-6">{[1,2,3,4].map(i=><Skeleton key={i} className="h-16 w-full"/>)}</div>
          ) : isError ? <div className="p-6"><PageError message="Unable to load evidence packets."/></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {[["Service","left","px-6"],["Date","left","px-4"],["Decision","left","px-4"],["Metric Violated","left","px-4"],["Signal Trust","right","px-4"],["Audit Hash","left","px-4"]].map(([h,align,px])=>(
                      <th key={h} className={`${px} py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide text-${align}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data?.continuityEvidencePackets??[]).map((pkt:EvidencePacket)=>(
                    <tr key={pkt.id} className="border-b border-border/50 hover:bg-amber-500/5 transition-colors">
                      <td className="px-6 py-3">
                        <span className="text-xs font-medium text-white truncate block max-w-[160px]" title={pkt.serviceName}>{pkt.serviceName}</span>
                        <span className="text-xs text-muted-foreground">{pkt.ownerTeam}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(pkt.generatedAt)}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-xs ${decisionColor(pkt.decision)}`}>{pkt.decision}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {pkt.metricViolated ? (
                          <span>
                            {pkt.metricViolated}{" "}
                            <span className="text-red-400 font-mono">{pkt.observedValue}{pkt.metricUnit?` ${pkt.metricUnit}`:""}</span>
                            {" vs "}
                            <span className="text-teal-400 font-mono">{pkt.baselineValue}{pkt.metricUnit?` ${pkt.metricUnit}`:""}</span>
                          </span>
                        ) : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-xs font-mono font-semibold ${pkt.signalTrustScore>=80?"text-teal-400":pkt.signalTrustScore>=60?"text-amber-400":"text-red-400"}`}>{pkt.signalTrustScore}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-muted-foreground/60 truncate block max-w-[120px]" title={pkt.auditHash}>{pkt.auditHash.slice(0,12)}…</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Risk explanation ───────────────────────────────────────────── */}
      {!isLoading && data && (
        <Card className={`border border-amber-500/20 bg-amber-500/5`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-amber-400">
              <Info className="w-4 h-4"/> Continuity Risk Explanation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {riskExplanation(level, data.continuityRiskScore, data.manualRecoveryRequired, data.failedPostRebootChecks, data.totalRebootEvents)}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-amber-500/10">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Primary Risk Driver</p>
                <p className="text-sm font-medium text-white">
                  {data.manualRecoveryRequired>0?"Manual Recovery Dependency":data.failedPostRebootChecks>3?"Health Check Failures":"Recovery Time"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Most Exposed Service</p>
                <p className="text-sm font-medium text-white truncate">
                  {data.affectedServices.sort((a,b)=>a.readiness.score-b.readiness.score)[0]?.serviceName??"—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Target Risk Level</p>
                <p className="text-sm font-medium text-teal-400">LOW (Score &lt; 25)</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Actions Required</p>
                <p className="text-sm font-medium text-white">{data.automationRecommendations.length} automation gaps identified</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── sub-components ──────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-1 h-4 rounded-full bg-amber-500/60" />
        <p className="text-xs font-bold uppercase tracking-widest text-amber-400/70">{label}</p>
      </div>
      {children}
    </div>
  );
}

function OperationalEventCard({
  title, subtitle, events, isLoading, icon,
}: {
  title: string; subtitle: string; events: OperationalEvent[];
  isLoading: boolean; icon: React.ReactNode;
}) {
  return (
    <Card className="border-amber-500/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">{icon}{title}</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-2 p-6">{[1,2].map(i=><Skeleton key={i} className="h-14 w-full"/>)}</div>
        ) : events.length===0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No events recorded.</p>
        ) : (
          <div className="divide-y divide-border">
            {events.map(ev=>(
              <div key={ev.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <span className="text-xs font-medium text-white truncate">{ev.serviceName}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className={`text-xs ${severityColor(ev.severity)}`}>{ev.severity}</Badge>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{fmtDateTime(ev.timestamp)}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-snug mb-1.5">{ev.description}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground/60">
                  <span>Duration: <span className={ev.durationMinutes>20?"text-red-400":ev.durationMinutes>10?"text-amber-400":"text-teal-400"}>{ev.durationMinutes}m</span></span>
                  {ev.resolvedAutomatically
                    ? <span className="text-teal-400 flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3"/> Auto-resolved</span>
                    : <span className="text-orange-400 flex items-center gap-0.5"><AlertTriangle className="w-3 h-3"/> Manual resolution</span>
                  }
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function KpiCard({
  title, value, isLoading, icon, valueClassName="text-white", subtitle, isString=false,
}: {
  title: string; value?: number|string; isLoading: boolean;
  icon?: React.ReactNode; valueClassName?: string; subtitle?: string; isString?: boolean;
}) {
  return (
    <Card className="border-amber-500/10">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          {icon}
        </div>
        {isLoading ? <Skeleton className="h-8 w-16"/> : (
          <p className={`text-2xl font-bold ${valueClassName}`}>{value??"—"}</p>
        )}
        {subtitle && !isLoading && <p className="text-xs text-muted-foreground/60 mt-1.5 leading-tight">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function PageError({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-lg border border-red-500/20 bg-red-500/5">
      <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0"/>
      <div>
        <p className="text-sm font-medium text-red-400">Failed to load</p>
        <p className="text-xs text-muted-foreground mt-0.5">{message}</p>
      </div>
    </div>
  );
}
