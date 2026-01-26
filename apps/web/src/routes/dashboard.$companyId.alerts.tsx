import { useParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { trpc, trpcClient } from "@/utils/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCard } from "@/components/dashboard/alert-card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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

  if (!companyId) return <div>No company selected</div>;

  const activeAlerts = alerts.filter((a) => a.status === "active" || a.status === "acknowledged");
  const resolvedAlerts = alerts.filter((a) => a.status === "resolved" || a.status === "dismissed");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Alerts</h1>
        <p className="text-muted-foreground">Monitor and manage system alerts</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">
          Active Alerts ({activeAlerts.length})
        </h2>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="py-6">
                  <div className="h-20 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : activeAlerts.length > 0 ? (
          <div className="space-y-3">
            {activeAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                id={alert.id}
                severity={alert.severity}
                title={alert.title}
                message={alert.message}
                departmentType={alert.departmentType}
                aiInsight={alert.aiInsight}
                createdAt={alert.createdAt}
                onAcknowledge={
                  alert.status === "active"
                    ? () => acknowledgeMutation.mutate(alert.id)
                    : undefined
                }
                onResolve={() => resolveMutation.mutate(alert.id)}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No active alerts</p>
            </CardContent>
          </Card>
        )}
      </div>

      {resolvedAlerts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">
            Resolved Alerts ({resolvedAlerts.length})
          </h2>
          <div className="space-y-3 opacity-60">
            {resolvedAlerts.slice(0, 10).map((alert) => (
              <AlertCard
                key={alert.id}
                id={alert.id}
                severity={alert.severity}
                title={alert.title}
                message={alert.message}
                departmentType={alert.departmentType}
                createdAt={alert.createdAt}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
