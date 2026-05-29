import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getMissionReadinessColor(readiness: string) {
  switch (readiness) {
    case "READY":
      return "bg-teal-500/10 text-teal-400 border-teal-500/20";
    case "AT_RISK":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "DEGRADED":
      return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    case "CRITICAL":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    default:
      return "bg-gray-500/10 text-gray-400 border-gray-500/20";
  }
}

export function getDebtScoreColor(score: number) {
  if (score <= 30) return "text-teal-400";
  if (score <= 60) return "text-amber-400";
  return "text-red-400";
}

export function getHealthScoreColor(score: number) {
  if (score >= 70) return "text-teal-400";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
}

export function getGovernanceStatusColor(status: string) {
  switch (status) {
    case "APPROVED":
      return "bg-teal-500/10 text-teal-400 border-teal-500/20";
    case "PENDING":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "BLOCKED":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    case "BYPASSED":
      return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    default:
      return "bg-gray-500/10 text-gray-400 border-gray-500/20";
  }
}

export function getGradeColor(grade?: string | null) {
  switch (grade) {
    case "A": return "text-teal-400 border-teal-400/30 bg-teal-400/10";
    case "B": return "text-green-400 border-green-400/30 bg-green-400/10";
    case "C": return "text-amber-400 border-amber-400/30 bg-amber-400/10";
    case "D": return "text-orange-400 border-orange-400/30 bg-orange-400/10";
    case "F": return "text-red-400 border-red-400/30 bg-red-400/10";
    default: return "text-gray-400 border-gray-400/30 bg-gray-400/10";
  }
}

export function getComponentScoreColor(score: number) {
  if (score <= 40) return "bg-red-500";
  if (score <= 65) return "bg-amber-500";
  return "bg-teal-500";
}

export function getSeverityColor(severity: string) {
  switch (severity) {
    case "LOW":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "MEDIUM":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "HIGH":
      return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    case "CRITICAL":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    default:
      return "bg-gray-500/10 text-gray-400 border-gray-500/20";
  }
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function getDecisionColor(decision?: string | null) {
  switch (decision) {
    case "ALLOWED":    return "bg-teal-500/10 text-teal-400 border-teal-500/20";
    case "BLOCKED":    return "bg-red-500/10 text-red-400 border-red-500/20";
    case "WARNED":     return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "OVERRIDDEN": return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    default:           return "bg-gray-500/10 text-gray-400 border-gray-500/20";
  }
}

export function getSignalTrustColor(score?: number | null) {
  if (score === undefined || score === null) return "text-gray-400";
  if (score >= 80) return "text-teal-400";
  if (score >= 60) return "text-blue-400";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
}

export function getFlakyLabelColor(label?: string | null) {
  switch (label) {
    case "Stable":    return "bg-teal-500/10 text-teal-400 border-teal-500/20";
    case "Watch":     return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "Noisy":     return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "Flaky":     return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    case "Untrusted": return "bg-red-500/10 text-red-400 border-red-500/20";
    default:          return "bg-gray-500/10 text-gray-400 border-gray-500/20";
  }
}

export function getConfidenceColor(confidence?: string | null) {
  switch (confidence) {
    case "HIGH":      return "text-teal-400";
    case "MODERATE":  return "text-amber-400";
    case "LOW":       return "text-orange-400";
    case "VERY_LOW":  return "text-red-400";
    default:          return "text-gray-400";
  }
}
