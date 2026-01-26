import { AlertCircle, AlertTriangle, Eye, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AlertCardProps {
  id: string;
  severity: "critical" | "warning" | "watch" | "opportunity";
  title: string;
  message: string;
  departmentType?: string | null;
  aiInsight?: string | null;
  createdAt: Date;
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
}

const severityConfig = {
  critical: {
    icon: AlertCircle,
    color: "text-red-500",
    bg: "bg-red-500/10 border-red-500/30",
    label: "Critical",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-orange-500",
    bg: "bg-orange-500/10 border-orange-500/30",
    label: "Warning",
  },
  watch: {
    icon: Eye,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10 border-yellow-500/30",
    label: "Watch",
  },
  opportunity: {
    icon: Sparkles,
    color: "text-green-500",
    bg: "bg-green-500/10 border-green-500/30",
    label: "Opportunity",
  },
};

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

export function AlertCard({
  id,
  severity,
  title,
  message,
  departmentType,
  aiInsight,
  createdAt,
  onAcknowledge,
  onResolve,
}: AlertCardProps) {
  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <Card className={cn("transition-colors", config.bg)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Icon className={cn("h-5 w-5", config.color)} />
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {departmentType && (
              <span className="px-2 py-0.5 bg-muted rounded">
                {deptLabels[departmentType] ?? departmentType}
              </span>
            )}
            <span>{new Date(createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{message}</p>
        {aiInsight && (
          <div className="text-sm p-2 bg-muted/50 rounded border-l-2 border-primary/50">
            <span className="font-medium">AI Insight: </span>
            {aiInsight}
          </div>
        )}
        <div className="flex gap-2">
          {onAcknowledge && (
            <Button variant="outline" size="sm" onClick={() => onAcknowledge(id)}>
              Acknowledge
            </Button>
          )}
          {onResolve && (
            <Button variant="default" size="sm" onClick={() => onResolve(id)}>
              Resolve
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
