import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Lightbulb } from "lucide-react";

import { trpc } from "@/utils/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { AlertCard } from "@/components/dashboard/alert-card";
import { DepartmentCard } from "@/components/dashboard/department-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardOverview() {
  const { companyId } = useParams<{ companyId: string }>();

  const { data: company } = useQuery({
    ...trpc.company.get.queryOptions({ id: companyId! }),
    enabled: !!companyId,
  });

  const { data: departments = [] } = useQuery({
    ...trpc.department.list.queryOptions({ companyId: companyId! }),
    enabled: !!companyId,
  });

  const { data: metrics = [] } = useQuery({
    ...trpc.metrics.getLatestValues.queryOptions({ companyId: companyId! }),
    enabled: !!companyId,
  });

  const { data: alerts = [] } = useQuery({
    ...trpc.alerts.list.queryOptions({
      companyId: companyId!,
      status: ["active", "acknowledged"],
      limit: 5,
    }),
    enabled: !!companyId,
  });

  const { data: recommendations = [] } = useQuery({
    ...trpc.recommendations.list.queryOptions({
      companyId: companyId!,
      status: ["pending"],
      limit: 3,
    }),
    enabled: !!companyId,
  });

  if (!companyId) return <div>No company selected</div>;

  const stageLabels: Record<string, string> = {
    bootstrap: "Bootstrap Stage",
    early: "Early Stage",
    growth: "Growth Stage",
    scale: "Scale Stage",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{company?.name || "Dashboard"}</h1>
        <p className="text-muted-foreground">
          {company?.stage ? stageLabels[company.stage] : "Company Overview"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {metrics.length > 0 ? (
          metrics.slice(0, 4).map((metric) => (
            <KpiCard
              key={metric.id}
              name={metric.name}
              value={metric.value}
              previousValue={metric.previousValue}
              unit={metric.unit}
              trend={metric.trend}
              changePercent={metric.changePercent}
              thresholds={metric.thresholds}
            />
          ))
        ) : (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.length > 0 ? (
              alerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  id={alert.id}
                  severity={alert.severity}
                  title={alert.title}
                  message={alert.message}
                  departmentType={alert.departmentType}
                  aiInsight={alert.aiInsight}
                  createdAt={alert.createdAt}
                />
              ))
            ) : (
              <p className="text-muted-foreground text-sm py-4 text-center">
                No active alerts
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Pending Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.length > 0 ? (
              recommendations.map((rec) => (
                <div key={rec.id} className="p-3 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-sm">{rec.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {rec.description.slice(0, 100)}...
                      </p>
                    </div>
                    <span className={"px-2 py-0.5 text-xs rounded " + (
                      rec.priority === "critical" ? "bg-red-500/10 text-red-500" :
                      rec.priority === "high" ? "bg-orange-500/10 text-orange-500" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {rec.priority}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm py-4 text-center">
                No pending recommendations
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Departments</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {departments.length > 0 ? (
            departments.map((dept) => (
              <DepartmentCard
                key={dept.id}
                id={dept.id}
                type={dept.type}
                name={dept.name}
                isEnabled={dept.isEnabled}
                companyId={companyId}
              />
            ))
          ) : (
            <Card className="col-span-full">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No departments configured</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
