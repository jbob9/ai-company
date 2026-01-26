import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  name: string;
  value: number | null;
  previousValue?: number | null;
  unit?: string | null;
  trend: "up" | "down" | "stable";
  changePercent?: number | null;
  thresholds?: {
    criticalMin?: number;
    criticalMax?: number;
    warningMin?: number;
    warningMax?: number;
    goodDirection?: "up" | "down" | "stable";
  } | null;
}

export function KpiCard({
  name,
  value,
  unit,
  trend,
  changePercent,
  thresholds,
}: KpiCardProps) {
  const formatValue = (val: number | null) => {
    if (val === null) return "—";
    if (unit === "USD" || unit === "$") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(val);
    }
    if (unit === "%") {
      return `${val.toFixed(1)}%`;
    }
    return val.toLocaleString();
  };

  const getTrendColor = () => {
    if (!thresholds?.goodDirection) {
      return trend === "up"
        ? "text-green-500"
        : trend === "down"
          ? "text-red-500"
          : "text-muted-foreground";
    }

    const isGood =
      (thresholds.goodDirection === "up" && trend === "up") ||
      (thresholds.goodDirection === "down" && trend === "down") ||
      (thresholds.goodDirection === "stable" && trend === "stable");

    return isGood ? "text-green-500" : trend !== "stable" ? "text-red-500" : "text-muted-foreground";
  };

  const getStatusColor = () => {
    if (value === null || !thresholds) return "";
    if (
      (thresholds.criticalMin !== undefined && value < thresholds.criticalMin) ||
      (thresholds.criticalMax !== undefined && value > thresholds.criticalMax)
    ) {
      return "border-red-500/50 bg-red-500/5";
    }
    if (
      (thresholds.warningMin !== undefined && value < thresholds.warningMin) ||
      (thresholds.warningMax !== undefined && value > thresholds.warningMax)
    ) {
      return "border-orange-500/50 bg-orange-500/5";
    }
    return "";
  };

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <Card className={cn("transition-colors", getStatusColor())}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div className="text-2xl font-bold">
            {formatValue(value)}
            {unit && unit !== "USD" && unit !== "$" && unit !== "%" && (
              <span className="text-sm font-normal text-muted-foreground ml-1">
                {unit}
              </span>
            )}
          </div>
          {changePercent !== null && changePercent !== undefined && (
            <div className={cn("flex items-center text-sm", getTrendColor())}>
              <TrendIcon className="h-4 w-4 mr-1" />
              {changePercent > 0 ? "+" : ""}
              {changePercent.toFixed(1)}%
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
