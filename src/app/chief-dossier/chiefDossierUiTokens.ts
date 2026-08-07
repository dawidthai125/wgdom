/**
 * WIRE-CHIEF-UI-DOSSIER-01 — icon + color token → class (presentational).
 */

import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BadgeCheck,
  Ban,
  Calculator,
  Check,
  CheckCircle2,
  Circle,
  Flag,
  Hammer,
  Loader2,
  Package,
  RefreshCw,
  Search,
  SkipForward,
  TrendingUp,
  X,
  XCircle,
} from "lucide-react";
import type { ChiefDossierColorToken, ChiefDossierIconKey } from "@/lib/chief-dossier-ui";

export function chiefDossierIcon(key: ChiefDossierIconKey): LucideIcon {
  switch (key) {
    case "idle":
      return Circle;
    case "search":
      return Search;
    case "loader":
      return Loader2;
    case "ban":
      return Ban;
    case "check":
      return CheckCircle2;
    case "x":
      return X;
    case "alert":
      return AlertTriangle;
    case "flag":
      return Flag;
    case "hammer":
      return Hammer;
    case "package":
      return Package;
    case "trending":
      return TrendingUp;
    case "calculator":
      return Calculator;
    case "badge":
      return BadgeCheck;
    case "loop":
      return RefreshCw;
    case "taskPending":
      return Circle;
    case "taskRunning":
      return Loader2;
    case "taskDone":
      return Check;
    case "taskFailed":
      return XCircle;
    case "taskSkipped":
      return SkipForward;
    default:
      return Flag;
  }
}

export function chiefDossierColorClass(token: ChiefDossierColorToken): string {
  switch (token) {
    case "primary":
      return "text-primary border-primary/30 bg-primary/10";
    case "success":
      return "text-emerald-700 dark:text-emerald-300 border-emerald-500/40 bg-emerald-500/10";
    case "warning":
      return "text-amber-800 dark:text-amber-300 border-amber-500/40 bg-amber-500/10";
    case "destructive":
      return "text-red-800 dark:text-red-300 border-red-500/40 bg-red-500/10";
    case "info":
      return "text-sky-800 dark:text-sky-300 border-sky-500/40 bg-sky-500/10";
    case "muted":
    default:
      return "text-muted-foreground border-border/60 bg-secondary/40";
  }
}

export function formatPlnDisplay(value: number): string {
  try {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value} PLN`;
  }
}
