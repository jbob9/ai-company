import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";

import { trpc } from "@/utils/trpc";
import { cn } from "@/lib/utils";

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

  if (!companyId) return null;

  const metricsByDept = metrics.reduce(
    (acc, metric) => {
      const dept = metric.departmentType;
      if (!acc[dept]) acc[dept] = [];
      acc[dept].push(metric);
      return acc;
    },
    {} as Record<string, typeof metrics>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Metrics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Track key performance indicators
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-panel rounded-xl p-4 animate-pulse">
              <div className="h-3 w-20 bg-foreground/5 rounded mb-3" />
              <div className="h-7 w-16 bg-foreground/5 rounded mb-2" />
              <div className="h-3 w-12 bg-foreground/5 rounded" />
            </div>
          ))}
        </div>
      ) : metrics.length > 0 ? (
        <div className="space-y-8">
          {Object.entries(metricsByDept).map(([dept, deptMetrics]) => (
            <div key={dept}>
              <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {deptLabels[dept] || dept}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {deptMetrics.map((metric) => {
                  const isPositive =
                    metric.changePercent !== null &&
                    metric.changePercent !== undefined &&
                    metric.changePercent > 0;
                  const isNegative =
                    metric.changePercent !== null &&
                    metric.changePercent !== undefined &&
                    metric.changePercent < 0;

                  return (
                    <div key={metric.id} className="glass-panel rounded-xl p-4">
                      <p className="text-[12px] text-muted-foreground font-medium mb-1.5">
                        {metric.name}
                      </p>
                      <div className="flex items-end gap-2">
                        <span className="text-2xl font-semibold tracking-tight">
                          {metric.unit === "currency" && "$"}
                          {typeof metric.value === "number"
                            ? metric.value.toLocaleString(undefined, {
                                maximumFractionDigits: 1,
                              })
                            : metric.value}
                          {metric.unit === "percent" && "%"}
                        </span>
                        {metric.changePercent != null && (
                          <div
                            className={cn(
                              "flex items-center gap-0.5 text-[11px] font-medium pb-1",
                              isPositive && "text-green-600",
                              isNegative && "text-red-500",
                              !isPositive && !isNegative && "text-muted-foreground"
                            )}
                          >
                            {isPositive ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : isNegative ? (
                              <TrendingDown className="h-3 w-3" />
                            ) : (
                              <Minus className="h-3 w-3" />
                            )}
                            {Math.abs(metric.changePercent).toFixed(1)}%
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-panel rounded-xl p-12 text-center">
          <BarChart3 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No metrics configured yet</p>
          <p className="text-muted-foreground/60 text-xs mt-1">
            Add KPI definitions to start tracking
          </p>
        </div>
      )}
    </div>
  );
}
