"use client";

import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { t as tHelper } from "@/lib/i18n";

export default function StatusBadge({ status, dict }) {
  const statusKey = status || "pending";
  const configs = {
    confirmed: {
      icon: CheckCircle2,
      className: "badge-confirmed",
      label: dict ? tHelper(dict, "confirmed") : "Confirmado",
    },
    pending: {
      icon: Clock,
      className: "badge-pending",
      label: dict ? tHelper(dict, "pending") : "Pendiente",
    },
    cancelled: {
      icon: XCircle,
      className: "badge-cancelled",
      label: dict ? tHelper(dict, "cancelled") : "Cancelado",
    },
  };

  const config = configs[statusKey] || configs.pending;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.className} gap-1.5 font-medium text-xs sm:text-sm`}>
      <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
      {config.label}
    </Badge>
  );
}
