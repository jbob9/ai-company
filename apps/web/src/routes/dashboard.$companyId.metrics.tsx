import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";

import { trpc } from "@/utils/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/kpi-card";

const deptLabels: Record<string, string> = {
  product: "Product",
  engineering: "Engineering",
  sales: "Sales",
  marketing: "Marketing",
  customer_success: "Customer Success",
  finance: "Finance",
  operations: "Operations",
  hr: "HR/People",
};

export default function MetricsPage() {
  const { companyId } = useParams<{ companyId: string }>();

  const { data: metrics = [], isLoading } = useQuery({
    ...trpc.metrics.getLatestValues.queryOptions({ companyId: companyId! }),
    enabled: !!companyId,
  });

  if (!companyId) return <div>No company selected</div>;

  const metricsByDept = metrics.reduce((acc, metric) => {
    const dept = metric.departmentType;
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(metric);
    return acc;
  }, {} as Record<string, typeof metrics>);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Metrics</h1>
        <p className="text-muted-foreground">Track your key performance indicators</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="py-8">
                <div className="h-16 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : metrics.length > 0 ? (
        Object.entries(metricsByDept).map(([dept, deptMetrics]) => (
          <div key={dept}>
            <h2 className="text-lg font-semibold mb-4">
              {deptLabels[dept] || dept}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {deptMetrics.map((metric) => (
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
              ))}
            </div>
          </div>
        ))
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-medium mb-2">No metrics yet</h3>
            <p className="text-muted-foreground">
              Add KPI definitions to start tracking metrics
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
