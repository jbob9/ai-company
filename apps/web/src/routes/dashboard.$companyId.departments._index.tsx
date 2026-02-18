import { useParams, Link } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Package,
  Code,
  DollarSign,
  Megaphone,
  HeartHandshake,
  Calculator,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

import { trpc, trpcClient } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const deptIcons: Record<string, LucideIcon> = {
  product: Package,
  engineering: Code,
  sales: DollarSign,
  marketing: Megaphone,
  customer_success: HeartHandshake,
  finance: Calculator,
  operations: Settings,
  hr: Users,
};

export default function DepartmentsPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const queryClient = useQueryClient();

  const { data: departments = [], isLoading } = useQuery({
    ...trpc.department.list.queryOptions({ companyId: companyId! }),
    enabled: !!companyId,
  });

  const { data: availableTypes = [] } = useQuery({
    ...trpc.department.availableTypes.queryOptions({ companyId: companyId! }),
    enabled: !!companyId,
  });

  const createDepartment = useMutation({
    mutationFn: (type: string) =>
      trpcClient.department.create.mutate({
        companyId: companyId!,
        type: type as Parameters<typeof trpcClient.department.create.mutate>[0]["type"],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["department", "list"] });
      queryClient.invalidateQueries({ queryKey: ["department", "availableTypes"] });
      toast.success("Department created");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const availableDepts = availableTypes.filter((t) => t.available);
  if (!companyId) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Departments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage departments and their AI agents
          </p>
        </div>
        {availableDepts.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button size="sm" className="gap-1.5 rounded-xl">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {availableDepts.map((dept) => (
                <DropdownMenuItem
                  key={dept.type}
                  onClick={() => createDepartment.mutate(dept.type)}
                >
                  {dept.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-panel rounded-xl p-5 animate-pulse">
              <div className="h-10 w-10 rounded-lg bg-foreground/5 mb-3" />
              <div className="h-4 w-24 bg-foreground/5 rounded mb-2" />
              <div className="h-3 w-16 bg-foreground/5 rounded" />
            </div>
          ))}
        </div>
      ) : departments.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {departments.map((dept) => {
            const Icon = deptIcons[dept.type] || Package;
            return (
              <Link
                key={dept.id}
                to={`/dashboard/${companyId}/departments/${dept.type}`}
                className={cn(
                  "glass-panel rounded-xl p-5 transition-colors block",
                  dept.isEnabled ? "hover:bg-foreground/2" : "opacity-50"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {dept.aiEnabled && (
                      <span className="px-2 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded-full">
                        AI
                      </span>
                    )}
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      dept.isEnabled ? "bg-green-500" : "bg-muted-foreground/30"
                    )} />
                  </div>
                </div>
                <h3 className="text-[14px] font-semibold">{dept.name}</h3>
                <p className="text-[12px] text-muted-foreground mt-0.5 capitalize">
                  {dept.type.replace("_", " ")}
                </p>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="glass-panel rounded-xl p-12 text-center">
          <p className="text-muted-foreground text-sm mb-4">No departments yet</p>
          {availableDepts.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button size="sm" className="gap-1.5 rounded-xl">
                  <Plus className="h-4 w-4" />
                  Add First Department
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {availableDepts.map((dept) => (
                  <DropdownMenuItem
                    key={dept.type}
                    onClick={() => createDepartment.mutate(dept.type)}
                  >
                    {dept.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
    </div>
  );
}
