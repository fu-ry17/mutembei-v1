import {
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  Globe,
  Terminal,
  Bell,
  CalendarClock,
  Hand,
  Users,
} from "lucide-react";

export interface StatusConfig {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  className: string;
}

export const STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-muted text-muted-foreground",
  },
  running: {
    label: "Running",
    icon: Loader2,
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive",
  },
};

export function getStatusConfig(status: string): StatusConfig {
  return (
    STATUS_CONFIG[status] ?? {
      label: status,
      icon: Clock,
      className: "bg-muted text-muted-foreground",
    }
  );
}

export interface TypeConfig {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const TYPE_CONFIG: Record<string, TypeConfig> = {
  self_onboarding: { label: "Self Onboarding", icon: Users },
  http: { label: "HTTP", icon: Globe },
  script: { label: "Script", icon: Terminal },
  notification: { label: "Notification", icon: Bell },
  scheduled: { label: "Scheduled", icon: CalendarClock },
  manual: { label: "Manual", icon: Hand },
};

export function getTypeConfig(type: string): TypeConfig {
  return TYPE_CONFIG[type] ?? { label: type, icon: Terminal };
}
