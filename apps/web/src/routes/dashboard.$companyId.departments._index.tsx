import { useParams, Link } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { trpc, trpcClient } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DepartmentCard } from "@/components/dashboard/department-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

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

  if (!companyId) {
    return <div>No company selected</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Departments</h1>
          <p className="text-muted-foreground">
            Manage your company departments and their AI agents
          </p>
        </div>
        {availableDepts.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Department
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="py-8">
                <div className="h-16 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : departments.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept) => (
            <DepartmentCard
              key={dept.id}
              id={dept.id}
              type={dept.type}
              name={dept.name}
              isEnabled={dept.isEnabled}
              companyId={companyId}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-medium mb-2">No departments yet</h3>
            <p className="text-muted-foreground mb-4">
              Add departments to start tracking metrics and get AI insights
            </p>
            {availableDepts.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Department
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
