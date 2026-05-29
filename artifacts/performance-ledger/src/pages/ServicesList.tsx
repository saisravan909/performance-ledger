import { useListServices } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getMissionReadinessColor, getDebtScoreColor, getHealthScoreColor, getGradeColor } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search, Download, AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { downloadCSV } from "@/lib/export";

export default function ServicesList() {
  const { data: services, isLoading, isError } = useListServices();
  const [search, setSearch] = useState("");

  const filteredServices =
    services?.filter((s) => s.name.toLowerCase().includes(search.toLowerCase())) || [];

  function handleExport() {
    const rows = (services || []).map((s) => ({
      id: s.id,
      name: s.name,
      tier: s.tier,
      owner: s.owner ?? "",
      grade: s.grade ?? "",
      score: s.score ?? "",
      healthScore: s.healthScore ?? "",
      debtScore: s.debtScore ?? "",
      missionReadiness: s.missionReadiness,
      status: s.status,
      scoreTrend: s.scoreTrend ?? "",
      scoreDelta: s.scoreDelta ?? "",
      errorRate: s.errorRate ?? "",
      p95Latency: s.p95Latency ?? "",
      throughput: s.throughput ?? "",
      releaseCount: s.releaseCount ?? "",
      lastUpdated: s.lastUpdated ?? "",
    }));
    downloadCSV(rows, "service-scorecard.csv");
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Service Scorecard</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive health and governance metrics across all active services. Grades are derived from a
            weighted composite of stability, regression frequency, test coverage, and benchmark signal reliability.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="flex-shrink-0 gap-2"
          onClick={handleExport}
          disabled={!services?.length}
          data-testid="btn-export-scorecard"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {isError && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-red-500/20 bg-red-500/5">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-400">Failed to load services</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Unable to retrieve the service registry. Verify the API server is running.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Fleet Overview</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {isLoading ? "Loading…" : `${services?.length ?? 0} services tracked`}
              </p>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search services..."
                className="pl-9 bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-services"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Readiness</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead className="text-right">Health Score</TableHead>
                    <TableHead className="text-right">Debt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        {search
                          ? `No services found matching "${search}"`
                          : "No services are currently tracked."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredServices.map((service) => (
                      <TableRow
                        key={service.id}
                        className="hover:bg-muted/50 cursor-pointer transition-colors group"
                        data-testid={`service-row-${service.id}`}
                      >
                        <TableCell className="font-medium">
                          <Link
                            href={`/services/${service.id}`}
                            className="block w-full h-full text-white group-hover:text-primary transition-colors"
                          >
                            {service.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-muted-foreground border-border">
                            {service.tier?.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getMissionReadinessColor(service.missionReadiness)}>
                            {service.missionReadiness?.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-start gap-1">
                            <Badge
                              variant="outline"
                              className={`font-bold ${getGradeColor(service.grade)}`}
                            >
                              {service.grade || "N/A"}
                            </Badge>
                            <div className="flex items-center gap-1">
                              {service.scoreTrend === "UP" && (
                                <TrendingUp className="w-3 h-3 text-teal-400" />
                              )}
                              {service.scoreTrend === "DOWN" && (
                                <TrendingDown className="w-3 h-3 text-red-400" />
                              )}
                              {service.scoreTrend === "STABLE" && (
                                <Minus className="w-3 h-3 text-gray-400" />
                              )}
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {service.score != null ? service.score.toFixed(1) : "—"}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell
                          className={`text-right font-semibold ${getHealthScoreColor(service.healthScore)}`}
                        >
                          {service.healthScore}
                        </TableCell>
                        <TableCell
                          className={`text-right font-semibold ${getDebtScoreColor(service.debtScore)}`}
                          title="Debt score: 0 = no debt, 100 = critical debt. Inverse of health score."
                        >
                          {service.debtScore}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
