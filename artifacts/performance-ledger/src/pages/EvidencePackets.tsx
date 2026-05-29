import { useListEvidencePackets } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import {
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Hash,
  Lock,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Download,
  AlertTriangle,
} from "lucide-react";
import {
  getDebtScoreColor,
  getFlakyLabelColor,
  getConfidenceColor,
  getDecisionColor,
  getSignalTrustColor,
  formatCurrency,
} from "@/lib/utils";
import { downloadCSV, downloadJSON } from "@/lib/export";

function getEvidenceStatusColor(status: string) {
  switch (status) {
    case "PASSED":
      return "bg-teal-500/10 text-teal-400 border-teal-500/20";
    case "FAILED":
      return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    case "BLOCKED":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    case "PENDING":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    default:
      return "bg-gray-500/10 text-gray-400 border-gray-500/20";
  }
}

function getSignalTrustBarColor(score: number) {
  if (score >= 71) return "bg-teal-500";
  if (score >= 41) return "bg-amber-500";
  return "bg-red-500";
}

export default function EvidencePackets() {
  const { data: packets, isLoading, isError } = useListEvidencePackets();
  const [search, setSearch] = useState("");
  const [filterDecision, setFilterDecision] = useState<string>("All");

  const filterDecisions = ["All", "Allowed", "Blocked", "Warned", "Overridden", "Reboot Recovery"];

  const { filteredPackets, kpis } = useMemo(() => {
    let allowed = 0;
    let blocked = 0;
    let warned = 0;
    let totalSignalTrust = 0;
    let totalEngineeringHoursSaved = 0;
    let totalCloudWasteAvoided = 0;
    let latestDate = new Date(0);

    const safePackets = packets || [];

    safePackets.forEach((p: any) => {
      if (p.decision === "ALLOWED") allowed++;
      if (p.decision === "BLOCKED") blocked++;
      if (p.decision === "WARNED") warned++;
      totalSignalTrust += p.signalTrustScore || 0;
      const d = new Date(p.generatedAt);
      if (d > latestDate) latestDate = d;
    });

    const avgSignalTrust =
      safePackets.length > 0 ? Math.round(totalSignalTrust / safePackets.length) : 0;

    const filtered = safePackets.filter((p: any) => {
      const matchesSearch =
        p.serviceName?.toLowerCase().includes(search.toLowerCase()) ||
        p.releaseVersion?.toLowerCase().includes(search.toLowerCase()) ||
        p.commitSha?.toLowerCase().includes(search.toLowerCase()) ||
        p.id?.toLowerCase().includes(search.toLowerCase());
      const matchesDecision =
        filterDecision === "All" ||
        (filterDecision === "Reboot Recovery" && p.eventType === "REBOOT_RECOVERY_AUDIT") ||
        (filterDecision !== "Reboot Recovery" && p.decision?.toUpperCase() === filterDecision.toUpperCase());
      return matchesSearch && matchesDecision;
    });

    filtered.forEach((p: any) => {
      totalEngineeringHoursSaved += p.estimatedEngineeringHoursSaved || 0;
      totalCloudWasteAvoided += p.estimatedCloudWasteAvoided || 0;
    });

    return {
      filteredPackets: filtered,
      kpis: {
        allowed,
        blocked,
        warned,
        avgSignalTrust,
        totalEngineeringHoursSaved,
        totalCloudWasteAvoided,
        latestDate: latestDate.getTime() === 0 ? null : latestDate,
      },
    };
  }, [packets, search, filterDecision]);

  function handleExportCSV() {
    const rows = filteredPackets.map((p: any) => ({
      id: p.id,
      serviceId: p.serviceId,
      serviceName: p.serviceName,
      releaseVersion: p.releaseVersion,
      commitSha: p.commitSha,
      generatedAt: p.generatedAt,
      decision: p.decision,
      status: p.status,
      eventType: p.eventType,
      policyName: p.policyName,
      confidence: p.confidence,
      signalTrustScore: p.signalTrustScore,
      debtScoreAtRelease: p.debtScoreAtRelease,
      passed: p.passed,
      failed: p.failed,
      blocked: p.blocked,
      metricViolated: p.metricViolated ?? "",
      baselineValue: p.baselineValue ?? "",
      observedValue: p.observedValue ?? "",
      deltaPercent: p.deltaPercent ?? "",
      flakyRiskLabel: p.flakyRiskLabel ?? "",
      estimatedEngineeringHoursSaved: p.estimatedEngineeringHoursSaved,
      estimatedCloudWasteAvoided: p.estimatedCloudWasteAvoided,
      ownerTeam: p.ownerTeam,
      approvedBy: p.approvedBy ?? "",
      auditHash: p.auditHash,
    }));
    downloadCSV(rows, "evidence-packets.csv");
  }

  function handleExportJSON() {
    downloadJSON(filteredPackets, "evidence-packets.json");
  }

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto text-slate-300">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Evidence Packets</h1>
          <p className="text-slate-400 mt-2">
            Immutable, tamper-evident audit trail for every release gate evaluation. Each packet captures
            the full governance context at the moment of decision, including benchmark results, signal trust
            scores, and a deterministic SHA-256 audit hash.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleExportCSV}
            disabled={filteredPackets.length === 0}
            data-testid="btn-export-evidence-csv"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleExportJSON}
            disabled={filteredPackets.length === 0}
            data-testid="btn-export-evidence-json"
          >
            <Download className="w-4 h-4" />
            Export JSON
          </Button>
        </div>
      </div>

      {isError && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-red-500/20 bg-red-500/5">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-400">Failed to load evidence packets</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Unable to retrieve the audit trail. Verify the API server is running.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard
          title="Allowed"
          value={kpis.allowed}
          valueClassName="text-teal-400"
          isLoading={isLoading}
          subtitle="Releases cleared for deployment"
          testId="kpi-allowed"
        />
        <Card className="bg-slate-900 border-slate-800 rounded-sm">
          <CardContent className="p-6">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
              Blocked / Warned
            </p>
            {isLoading ? (
              <Skeleton className="h-8 w-20 bg-slate-800" />
            ) : (
              <div className="flex items-baseline gap-2 font-mono">
                <span className="text-3xl font-bold text-red-400" data-testid="kpi-blocked">
                  {kpis.blocked}
                </span>
                <span className="text-slate-500">/</span>
                <span className="text-3xl font-bold text-amber-400" data-testid="kpi-warned">
                  {kpis.warned}
                </span>
              </div>
            )}
            <p className="text-xs text-slate-600 mt-1.5">Gate failures / advisory holds</p>
          </CardContent>
        </Card>
        <KpiCard
          title="Avg Signal Trust"
          value={kpis.avgSignalTrust}
          valueClassName={getSignalTrustColor(kpis.avgSignalTrust)}
          isLoading={isLoading}
          subtitle="0–100. Reflects benchmark reliability at gate time"
          testId="kpi-trust"
        />
        <KpiCard
          title="Hrs Saved (Est.)"
          value={kpis.totalEngineeringHoursSaved}
          valueClassName="text-teal-400"
          isLoading={isLoading}
          subtitle="Engineering time saved via automated governance"
          testId="kpi-hours"
        />
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/50 p-3 rounded-sm border border-slate-800">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search service, version, SHA, packet ID..."
            className="pl-9 bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-600 rounded-sm font-mono text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-evidence"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {filterDecisions.map((decision) => (
            <button
              key={decision}
              onClick={() => setFilterDecision(decision)}
              className={`px-4 py-1.5 rounded-sm text-xs font-mono font-medium transition-colors uppercase tracking-wider ${
                filterDecision === decision
                  ? "bg-teal-500/10 border border-teal-500/30 text-teal-400"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-300"
              }`}
              data-testid={`filter-${decision.toLowerCase()}`}
            >
              {decision}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full bg-slate-900 rounded-sm" />
          ))}
        </div>
      ) : filteredPackets.length === 0 ? (
        <div className="text-center py-16 text-slate-500 bg-slate-900/50 rounded-sm border border-slate-800 font-mono text-sm border-dashed">
          <p>No evidence packets match the current filters.</p>
          {(search || filterDecision !== "All") && (
            <button
              className="mt-3 text-teal-400 hover:underline text-xs"
              onClick={() => {
                setSearch("");
                setFilterDecision("All");
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {filteredPackets.map((packet: any) => (
              <PacketCard key={packet.id} packet={packet} />
            ))}
          </div>

          <div className="bg-slate-900/30 border-y border-slate-800/50 py-4 px-6 flex flex-wrap items-center justify-between text-sm font-mono text-slate-400">
            <div>
              Governance value across {filteredPackets.length} packet{filteredPackets.length !== 1 ? "s" : ""}:
            </div>
            <div className="flex items-center gap-6 mt-2 sm:mt-0">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">ENG HOURS SAVED:</span>
                <span className="text-teal-400">{kpis.totalEngineeringHoursSaved}h</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">WASTE AVOIDED:</span>
                <span className="text-teal-400">{formatCurrency(kpis.totalCloudWasteAvoided)}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PacketCard({ packet }: { packet: any }) {
  const [showNotes, setShowNotes] = useState(false);

  return (
    <Card
      className="bg-slate-900 border-slate-800 rounded-sm overflow-hidden flex flex-col font-sans shadow-xl"
      data-testid={`packet-${packet.id}`}
    >
      <div className="bg-slate-950/80 border-b border-slate-800 px-5 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Badge
            variant="outline"
            className={`rounded-sm font-mono uppercase tracking-wider text-xs border ${getDecisionColor(packet.decision)}`}
          >
            {packet.decision || "UNKNOWN"}
          </Badge>
          <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">
            {packet.eventType}
          </span>
          <span className="font-bold text-slate-200">{packet.serviceName}</span>
          <span className="text-slate-500 text-sm">{packet.releaseVersion}</span>
          <span className="font-mono text-xs text-slate-600 bg-slate-900 px-2 py-0.5 rounded-sm">
            {packet.commitSha?.substring(0, 12)}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-mono text-slate-500">
            {new Date(packet.generatedAt).toLocaleString()}
          </span>
          <Badge
            variant="outline"
            className={`rounded-sm font-mono uppercase text-xs border ${getEvidenceStatusColor(packet.status)}`}
          >
            {packet.status || "UNKNOWN"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800 p-0">
        <div className="p-5 space-y-4">
          <DetailRow label="POLICY" value={packet.policyName} />
          <DetailRow label="OWNER TEAM" value={packet.ownerTeam} />

          <div>
            <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-1.5">
              CHECKS
            </div>
            <div className="flex items-center gap-4 text-sm font-mono bg-slate-950/50 p-2 rounded-sm border border-slate-800/50">
              <span className="flex items-center text-teal-400" title="Passed">
                <CheckCircle className="w-4 h-4 mr-1.5 opacity-80" />
                {packet.passed || 0}
              </span>
              <span className="flex items-center text-orange-400" title="Failed">
                <XCircle className="w-4 h-4 mr-1.5 opacity-80" />
                {packet.failed || 0}
              </span>
              <span className="flex items-center text-red-400" title="Blocked">
                <AlertCircle className="w-4 h-4 mr-1.5 opacity-80" />
                {packet.blocked || 0}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/50">
            {packet.metricViolated ? (
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-red-500/80 tracking-widest uppercase flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3" /> VIOLATION
                </div>
                <div className="font-mono text-sm text-slate-300">{packet.metricViolated}</div>
                <div className="text-xs text-red-400 font-mono">
                  {packet.baselineValue}
                  {packet.metricUnit} → {packet.observedValue}
                  {packet.metricUnit}
                  <span className="ml-2 bg-red-500/10 px-1.5 py-0.5 rounded-sm">
                    +{packet.deltaPercent?.toFixed(1)}%
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-slate-500 pt-1">
                <ShieldCheck className="w-4 h-4 text-teal-500/70" />
                <span>No metric violations detected</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-5 space-y-4 bg-slate-900/30">
          <div>
            <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-1.5 flex justify-between">
              <span>SIGNAL TRUST</span>
              <span className={`font-mono text-xs ${getSignalTrustColor(packet.signalTrustScore)}`}>
                {packet.signalTrustScore || 0}/100
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-sm overflow-hidden">
              <div
                className={`h-full ${getSignalTrustBarColor(packet.signalTrustScore || 0)}`}
                style={{ width: `${Math.min(100, Math.max(0, packet.signalTrustScore || 0))}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-600 mt-1">
              Reflects benchmark reliability at gate evaluation time. Below 40 = results may be unreliable.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-1.5">
                CONFIDENCE
              </div>
              <div className={`text-sm font-mono ${getConfidenceColor(packet.confidence)}`}>
                {packet.confidence?.replace("_", " ") || "UNKNOWN"}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-1.5">
                DEBT AT RELEASE
              </div>
              <div
                className={`text-sm font-mono ${getDebtScoreColor(packet.debtScoreAtRelease || 0)}`}
              >
                {packet.debtScoreAtRelease || 0}
              </div>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-1.5">
              FLAKY RISK LABEL
            </div>
            <Badge
              variant="outline"
              className={`rounded-sm text-[10px] uppercase font-mono tracking-wider ${getFlakyLabelColor(packet.flakyRiskLabel)}`}
            >
              {packet.flakyRiskLabel || "NONE"}
            </Badge>
          </div>
        </div>

        <div className="p-5 space-y-4 flex flex-col">
          <div className="flex-1 space-y-4">
            <div>
              <div className="text-[10px] font-bold text-amber-500/80 tracking-widest uppercase mb-1.5">
                RECOMMENDED ACTION
              </div>
              <div className="text-sm text-slate-400 leading-relaxed">
                {packet.recommendedAction || "No action specified."}
              </div>
            </div>

            {packet.approvedBy && (
              <div>
                <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-1.5">
                  APPROVED BY
                </div>
                <div className="text-sm text-teal-400 font-mono">{packet.approvedBy}</div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800/50">
            <div className="text-[10px] font-bold text-slate-600 tracking-widest uppercase mb-1 flex items-center gap-1.5">
              <Hash className="w-3 h-3" /> AUDIT HASH
            </div>
            <div
              className="font-mono text-xs text-slate-500 break-all select-all bg-slate-950 p-2 rounded-sm border border-slate-800/50"
              data-testid={`audit-hash-${packet.id}`}
            >
              {packet.auditHash || "Pending…"}
            </div>
            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-600 uppercase tracking-widest">
              <Lock className="w-3 h-3" /> SHA-256 · tamper-evident
            </div>
          </div>
        </div>
      </div>

      {packet.notes && (
        <div className="border-t border-slate-800 bg-slate-950/40">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="w-full px-5 py-2.5 flex items-center justify-center gap-2 text-xs font-mono text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-colors"
          >
            {showNotes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showNotes ? "Hide Notes" : "View Notes"}
          </button>
          {showNotes && (
            <div className="px-5 pb-5 pt-2">
              <div className="bg-slate-900 border border-slate-800 rounded-sm p-4 text-sm text-slate-400 italic">
                {packet.notes}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div>
      <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-0.5">
        {label}
      </div>
      <div className="text-sm text-slate-300 font-medium">{value || "—"}</div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  valueClassName,
  isLoading,
  subtitle,
  testId,
}: {
  title: string;
  value: number | string;
  valueClassName?: string;
  isLoading: boolean;
  subtitle?: string;
  testId: string;
}) {
  return (
    <Card className="bg-slate-900 border-slate-800 rounded-sm">
      <CardContent className="p-6">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">{title}</p>
        {isLoading ? (
          <Skeleton className="h-8 w-20 bg-slate-800" />
        ) : (
          <p className={`text-3xl font-bold font-mono ${valueClassName || "text-slate-200"}`} data-testid={testId}>
            {value}
          </p>
        )}
        {subtitle && !isLoading && (
          <p className="text-[10px] text-slate-600 mt-1.5 leading-tight">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
