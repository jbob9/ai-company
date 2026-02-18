import { useParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  XCircle,
  Check,
  Eye,
  Bell,
} from "lucide-react";

import { trpc, trpcClient } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const severityConfig = {
  critical: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10" },
  warning: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10" },
  info: { icon: Info, color: "text-blue-500", bg: "bg-blue-500/10" },
  opportunity: { icon: AlertCircle, color: "text-green-500", bg: "bg-green-500/10" },
};

const deptLabels: Record<string, string> = {
  product: "Product",
  engineering: "Engineering",
  sales: "Sales",
  marketing: "Marketing",
  customer_success: "Customer Success",
  finance: "Finance",
  operations: "Operations",
  hr: "HR",
};

export default function AlertsPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading } = useQuery({
    ...trpc.alerts.list.queryOptions({
      companyId: companyId!,
      limit: 50,
    }),
    enabled: !!companyId,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) => trpcClient.alerts.acknowledge.mutate({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      toast.success("Alert acknowledged");
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => trpcClient.alerts.resolve.mutate({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      toast.success("Alert resolved");
    },
  });

  if (!companyId) return null;

  const activeAlerts = alerts.filter(
    (a) => a.status === "active" || a.status === "acknowledged"
  );
  const resolvedAlerts = alerts.filter(
    (a) => a.status === "resolved" || a.status === "dismissed"
  );

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Alerts</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Monitor and manage system alerts
        </p>
      </div>

      <div className="mb-8">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Active ({activeAlerts.length})
        </h2>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass-panel rounded-xl p-4 animate-pulse">
                <div className="h-4 w-48 bg-foreground/5 rounded mb-2" />
                <div className="h-3 w-64 bg-foreground/5 rounded" />
              </div>
            ))}
          </div>
        ) : activeAlerts.length > 0 ? (
          <div className="space-y-2">
            {activeAlerts.map((alert) => {
              const config =
                severityConfig[alert.severity as keyof typeof severityConfig] ||
                severityConfig.info;
              const Icon = config.icon;
              return (
                <div key={alert.id} className="glass-panel rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                        config.bg
                      )}
                    >
                      <Icon className={cn("h-4 w-4", config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-[13px] font-semibold">{alert.title}</h3>
                        {alert.departmentType && (
                          <span className="text-[10px] text-muted-foreground bg-foreground/4 px-1.5 py-0.5 rounded">
                            {deptLabels[alert.departmentType] || alert.departmentType}
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
                        {alert.message}
                      </p>
                      {alert.aiInsight && (
                        <p className="text-[11.5px] text-primary/80 mt-2 italic">
                          {alert.aiInsight}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {alert.status === "active" && (
                        <button
                          onClick={() => acknowledgeMutation.mutate(alert.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
                          title="Acknowledge"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => resolveMutation.mutate(alert.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-green-600 hover:bg-green-500/10 transition-colors"
                        title="Resolve"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass-panel rounded-xl p-8 text-center">
            <Bell className="h-7 w-7 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">No active alerts</p>
          </div>
        )}
      </div>

      {resolvedAlerts.length > 0 && (
        <div>
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Resolved ({resolvedAlerts.length})
          </h2>
          <div className="space-y-2 opacity-50">
            {resolvedAlerts.slice(0, 10).map((alert) => {
              const config =
                severityConfig[alert.severity as keyof typeof severityConfig] ||
                severityConfig.info;
              const Icon = config.icon;
              return (
                <div key={alert.id} className="glass-panel rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                        config.bg
                      )}
                    >
                      <Icon className={cn("h-3.5 w-3.5", config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[12px] font-medium">{alert.title}</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {alert.message}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
