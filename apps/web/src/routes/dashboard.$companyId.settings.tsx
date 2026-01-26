import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { trpc, trpcClient } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

export default function SettingsPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: company } = useQuery({
    ...trpc.company.get.queryOptions({ id: companyId! }),
    enabled: !!companyId,
  });

  const [name, setName] = useState(company?.name || "");
  const [stage, setStage] = useState(company?.stage || "bootstrap");
  const [industry, setIndustry] = useState(company?.industry || "");
  const [employeeCount, setEmployeeCount] = useState(String(company?.employeeCount || ""));

  const updateCompany = useMutation({
    mutationFn: () =>
      trpcClient.company.update.mutate({
        id: companyId!,
        name: name || undefined,
        stage: stage as "bootstrap" | "early" | "growth" | "scale",
        industry: industry || undefined,
        employeeCount: employeeCount ? parseInt(employeeCount) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company"] });
      toast.success("Settings saved");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteCompany = useMutation({
    mutationFn: () => trpcClient.company.delete.mutate({ id: companyId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company"] });
      toast.success("Company deleted");
      navigate("/dashboard");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const initDepartments = useMutation({
    mutationFn: () =>
      trpcClient.department.initializeForStage.mutate({
        companyId: companyId!,
        stage: stage as "bootstrap" | "early" | "growth" | "scale",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["department"] });
      toast.success("Departments initialized");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (!companyId) return <div>No company selected</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your company settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Company Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stage">Company Stage</Label>
            <select
              id="stage"
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="bootstrap">Bootstrap</option>
              <option value="early">Early Stage</option>
              <option value="growth">Growth Stage</option>
              <option value="scale">Scale Stage</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Input
              id="industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="employees">Employee Count</Label>
            <Input
              id="employees"
              type="number"
              value={employeeCount}
              onChange={(e) => setEmployeeCount(e.target.value)}
            />
          </div>

          <Button onClick={() => updateCompany.mutate()} disabled={updateCompany.isPending}>
            {updateCompany.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Initialize Departments</CardTitle>
          <CardDescription>
            Create default departments based on your company stage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => initDepartments.mutate()} disabled={initDepartments.isPending}>
            {initDepartments.isPending ? "Initializing..." : "Initialize Departments"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-red-500/50">
        <CardHeader>
          <CardTitle className="text-red-500">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm("Are you sure? This action cannot be undone.")) {
                deleteCompany.mutate();
              }
            }}
            disabled={deleteCompany.isPending}
          >
            {deleteCompany.isPending ? "Deleting..." : "Delete Company"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
