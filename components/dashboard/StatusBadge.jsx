"use client";

import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function StatusBadge({ status, t }) {
  const configs = {
    confirmed: {
      icon: CheckCircle2,
      className: "badge-confirmed",
      label: t?.confirmed || "Confirmado",
    },
    pending: {
      icon: Clock,
      className: "badge-pending",
      label: t?.pending || "Pendiente",
    },
    cancelled: {
      icon: XCircle,
      className: "badge-cancelled",
      label: t?.cancelled || "Cancelado",
    },
  };

  const config = configs[status] || configs.pending;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.className} gap-1.5 font-medium`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </Badge>
  );
}
