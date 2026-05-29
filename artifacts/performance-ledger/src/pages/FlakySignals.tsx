import { useListFlakySignals, useGetFlakySignalSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getFlakyLabelColor, getConfidenceColor } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { Search, Download, AlertTriangle } from "lucide-react";
import { downloadCSV } from "@/lib/export";

function getRiskScoreColor(label?: string) {
  if (label === "Flaky" || label === "Untrusted") return "text-red-400";
  if (label === "Noisy") return "text-amber-400";
  if (label === "Watch") return "text-blue-400";
  if (label === "Stable") return "text-teal-400";
  return "text-gray-400";
}

function getRiskComponentColor(score?: number) {
  if (!score || score <= 40) return "bg-teal-500";
  if (score <= 65) return "bg-amber-500";
  return "bg-red-500";
}

export default function FlakySignals() {
  const {
    data: summary,
    isLoading: isLoadingSummary,
    isError: isErrorSummary,
  } = useGetFlakySignalSummary();
  const {
    data: signals,
    isLoading: isLoadingSignals,
    isError: isErrorSignals,
  } = useListFlakySignals();

  const [search, setSearch] = useState("");
  const [filterLabel, setFilterLabel] = useState<string>("All");

  const filterLabels = ["All", "Stable", "Watch", "Noisy", "Flaky", "Untrusted"];

  const { filteredSignals, counts } = useMemo(() => {
    let untrustedFlaky = 0;
    let watchNoisy = 0;
    let stableCount = 0;

    signals?.forEach((s: any) => {
      if (s.flakyLabel === "Flaky" || s.flakyLabel === "Untrusted") untrustedFlaky++;
      if (s.flakyLabel === "Watch" || s.flakyLabel === "Noisy") watchNoisy++;
      if (s.flakyLabel === "Stable") stableCount++;
    });

    const filtered =
      signals?.filter((s: any) => {
        const matchesSearch =
          s.benchmark?.toLowerCase().includes(search.toLowerCase()) ||
          s.serviceName?.toLowerCase().includes(search.toLowerCase());
        const matchesLabel = filterLabel === "All" || s.flakyLabel === filterLabel;
        return matchesSearch && matchesLabel;
      }) || [];

    return { filteredSignals: filtered, counts: { untrustedFlaky, watchNoisy, stableCount } };
  }, [signals, search, filterLabel]);

  function handleExport() {
    const rows = filteredSignals.map((s: any) => ({
      id: s.id,
      serviceName: s.serviceName,
      benchmark: s.benchmark,
      flakyLabel: s.flakyLabel ?? "",
      flakyRiskScore: s.flakyRiskScore ?? s.flakinessScore ?? "",
      confidence: s.confidence ?? "",
      status: s.status,
      severity: s.severity,
      primaryCause: s.primaryCause ?? "",
      detectedAt: s.detectedAt ?? "",
      affectedRuns: s.affectedRuns,
      totalRuns: s.totalRuns,
    }));
    downloadCSV(rows, "flaky-signals.csv");
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Flaky Signals</h1>
          <p className="text-muted-foreground mt-2">
            Benchmark noise analysis and remediation guidance. Each signal represents a performance
            gate with unreliable or inconsistent results that may be misclassifying valid releases.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="flex-shrink-0 gap-2"
          onClick={handleExport}
          disabled={filteredSignals.length === 0}
          data-testid="btn-export-signals"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {(isErrorSummary || isErrorSignals) && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-red-500/20 bg-red-500/5">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-400">Failed to load benchmark signals</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Unable to retrieve flaky detection data. Verify the API server is running.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Benchmarks"
          value={summary?.totalSignals}
          isLoading={isLoadingSummary}
          subtitle="All tracked benchmark gates"
          testId="metric-total-signals"
        />
        <MetricCard
          title="Untrusted / Flaky"
          value={counts.untrustedFlaky}
          isLoading={isLoadingSignals}
          valueClassName={counts.untrustedFlaky > 0 ? "text-red-400" : "text-white"}
          subtitle="Gates that must not block releases"
          testId="metric-untrusted-flaky"
        />
        <MetricCard
          title="Watch / Noisy"
          value={counts.watchNoisy}
          isLoading={isLoadingSignals}
          valueClassName={counts.watchNoisy > 0 ? "text-amber-400" : "text-white"}
          subtitle="Gates requiring soft-gate treatment"
          testId="metric-watch-noisy"
        />
        <MetricCard
          title="Stable"
          value={counts.stableCount}
          isLoading={isLoadingSignals}
          valueClassName="text-teal-400"
          subtitle="Reliable hard gates you can trust"
          testId="metric-stable"
        />
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Signal Registry</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Risk Score (0–100): composite of flip rate, variance, runner noise, baseline drift, and rerun
                disagreement. Labels: Stable &lt;30, Watch 30–50, Noisy 50–70, Flaky 70–85, Untrusted 85+.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/20 p-4 rounded-lg border border-border">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search benchmark or service..."
                className="pl-9 bg-background/50 border-border"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-signals"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {filterLabels.map((label) => (
                <button
                  key={label}
                  onClick={() => setFilterLabel(label)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    filterLabel === label
                      ? "bg-teal-500/20 text-teal-400"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                  data-testid={`filter-${label.toLowerCase()}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {isLoadingSignals ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-64 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredSignals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-border">
              <p className="font-medium">No signals found</p>
              <p className="text-sm mt-1">
                {search || filterLabel !== "All"
                  ? "Try adjusting your search or filter."
                  : "No benchmark signals are currently tracked."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSignals.map((signal: any) => (
                <SignalCard key={signal.id} signal={signal} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SignalCard({ signal }: { signal: any }) {
  return (
    <Card
      className="bg-card border-border overflow-hidden"
      data-testid={`signal-card-${signal.id}`}
    >
      <div className="p-5 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap flex-1">
          <div>
            <h3 className="font-semibold text-white text-base tracking-tight">{signal.benchmark}</h3>
            <p className="text-muted-foreground text-sm">{signal.serviceName}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getFlakyLabelColor(signal.flakyLabel)}>
              {signal.flakyLabel || "Unknown"}
            </Badge>
            <Badge variant="outline" className="border-border bg-transparent">
              <span className={getConfidenceColor(signal.confidence)}>
                {signal.confidence?.replace("_", " ") || "UNKNOWN"} confidence
              </span>
            </Badge>
            <Badge variant="outline" className="border-border text-muted-foreground uppercase text-xs">
              {signal.status}
            </Badge>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
            Risk Score
          </div>
          <div
            className={`text-3xl font-bold font-mono ${getRiskScoreColor(signal.flakyLabel)}`}
            data-testid={`risk-score-${signal.id}`}
          >
            {signal.flakyRiskScore ?? signal.flakinessScore ?? 0}
          </div>
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Risk Component Breakdown
          </h4>
          <div className="space-y-3">
            <RiskBar label="Same-Commit Flip Rate" value={signal.riskComponents?.sameCommitFlipRate} />
            <RiskBar label="Metric Variance" value={signal.riskComponents?.metricVarianceScore} />
            <RiskBar label="Runner Noise" value={signal.riskComponents?.runnerNoiseScore} />
            <RiskBar label="Baseline Drift" value={signal.riskComponents?.baselineDriftScore} />
            <RiskBar label="Near-Threshold Failure" value={signal.riskComponents?.nearThresholdFailureRate} />
            <RiskBar label="Rerun Disagreement" value={signal.riskComponents?.rerunDisagreementRate} />
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <div className="text-xs font-semibold text-teal-400/90 tracking-widest uppercase mb-1">
              Executive Assessment
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {signal.executiveSummary || "No executive assessment available."}
            </p>
          </div>

          <div>
            <div className="text-xs font-semibold text-amber-400/90 tracking-widest uppercase mb-1">
              Gate Recommendation
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {signal.gateRecommendation || "No gate recommendation available."}
            </p>
          </div>

          <div>
            <div className="text-xs font-semibold text-indigo-400/90 tracking-widest uppercase mb-1">
              Remediation Path
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {signal.remediationRecommendation || "No remediation path defined."}
            </p>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-1">
              Developer Note
            </div>
            <p className="text-xs text-muted-foreground/80 leading-relaxed font-mono">
              {signal.developerNote || "No developer notes."}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function RiskBar({ label, value = 0 }: { label: string; value?: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-white font-mono">{value}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${getRiskComponentColor(value)}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
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
  value?: number;
  isLoading: boolean;
  valueClassName?: string;
  subtitle?: string;
  testId: string;
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6">
        <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
        {isLoading ? (
          <Skeleton className="h-8 w-20 bg-muted/50" />
        ) : (
          <p className={`text-3xl font-bold font-mono ${valueClassName}`} data-testid={testId}>
            {value ?? 0}
          </p>
        )}
        {subtitle && !isLoading && (
          <p className="text-xs text-muted-foreground/60 mt-1.5 leading-tight">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
