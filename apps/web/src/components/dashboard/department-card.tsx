import { Link } from "react-router";
import {
  Package, Code, DollarSign, Megaphone, HeartHandshake,
  Calculator, Settings, Users, Scale, BarChart3, Building2, Shield,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DepartmentCardProps {
  id: string;
  type: string;
  name: string;
  isEnabled: boolean;
  healthScore?: number;
  alertCount?: number;
  companyId: string;
}

const departmentIcons: Record<string, LucideIcon> = {
  product: Package,
  engineering: Code,
  sales: DollarSign,
  marketing: Megaphone,
  customer_success: HeartHandshake,
  finance: Calculator,
  operations: Settings,
  hr: Users,
  legal: Scale,
  data_analytics: BarChart3,
  corporate_development: Building2,
  security_compliance: Shield,
};

export function DepartmentCard({
  type,
  name,
  isEnabled,
  healthScore,
  alertCount = 0,
  companyId,
}: DepartmentCardProps) {
  const Icon = departmentIcons[type] ?? Package;

  const getHealthColor = (score?: number) => {
    if (score === undefined) return "text-muted-foreground";
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  return (
    <Link to={`/dashboard/${companyId}/departments/${type}`}>
      <Card className={cn(
        "hover:border-primary/50 transition-colors cursor-pointer",
        !isEnabled && "opacity-50"
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base font-medium">{name}</CardTitle>
            </div>
            {alertCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-red-500/10 text-red-500 rounded-full">
                {alertCount} alerts
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Health Score</span>
            <span className={cn("font-medium", getHealthColor(healthScore))}>
              {healthScore !== undefined ? healthScore + "/100" : "\u2014"}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
