import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { trpc, trpcClient } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function SettingsPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: company } = useQuery({
    ...trpc.company.get.queryOptions({ id: companyId! }),
    enabled: !!companyId,
  });

  const [name, setName] = useState("");
  const [stage, setStage] = useState("bootstrap");
  const [industry, setIndustry] = useState("");
  const [employeeCount, setEmployeeCount] = useState("");

  useEffect(() => {
    if (company) {
      setName(company.name || "");
      setStage(company.stage || "bootstrap");
      setIndustry(company.industry || "");
      setEmployeeCount(String(company.employeeCount || ""));
    }
  }, [company]);

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
    onError: (error) => toast.error(error.message),
  });

  const deleteCompany = useMutation({
    mutationFn: () => trpcClient.company.delete.mutate({ id: companyId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company"] });
      toast.success("Company deleted");
      navigate("/dashboard");
    },
    onError: (error) => toast.error(error.message),
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
    onError: (error) => toast.error(error.message),
  });

  if (!companyId) return null;

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage company configuration</p>
      </div>

      <div className="space-y-6">
        <div className="glass-panel rounded-xl p-5 space-y-4">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
            Company Info
          </h2>
          <div className="space-y-3">
            <div>
              <Label htmlFor="name" className="text-[12px]">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 glass-input rounded-lg border-0 h-9 text-[13px]"
              />
            </div>
            <div>
              <Label htmlFor="stage" className="text-[12px]">
                Stage
              </Label>
              <select
                id="stage"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full mt-1 glass-input rounded-lg h-9 px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-primary/30"
              >
                <option value="bootstrap">Bootstrap</option>
                <option value="early">Early Stage</option>
                <option value="growth">Growth Stage</option>
                <option value="scale">Scale Stage</option>
              </select>
            </div>
            <div>
              <Label htmlFor="industry" className="text-[12px]">
                Industry
              </Label>
              <Input
                id="industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="mt-1 glass-input rounded-lg border-0 h-9 text-[13px]"
              />
            </div>
            <div>
              <Label htmlFor="employees" className="text-[12px]">
                Employees
              </Label>
              <Input
                id="employees"
                type="number"
                value={employeeCount}
                onChange={(e) => setEmployeeCount(e.target.value)}
                className="mt-1 glass-input rounded-lg border-0 h-9 text-[13px]"
              />
            </div>
          </div>
          <Button
            size="sm"
            className="rounded-xl"
            onClick={() => updateCompany.mutate()}
            disabled={updateCompany.isPending}
          >
            {updateCompany.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        <div className="glass-panel rounded-xl p-5 space-y-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
            Quick Setup
          </h2>
          <p className="text-[12px] text-muted-foreground">
            Create default departments for your company stage
          </p>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl"
            onClick={() => initDepartments.mutate()}
            disabled={initDepartments.isPending}
          >
            {initDepartments.isPending ? "Initializing..." : "Initialize Departments"}
          </Button>
        </div>

        <div className="glass-panel rounded-xl p-5 space-y-3 border-red-500/20">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-red-500/80">
            Danger Zone
          </h2>
          <Button
            size="sm"
            variant="destructive"
            className="rounded-xl"
            onClick={() => {
              if (confirm("Are you sure? This action cannot be undone.")) {
                deleteCompany.mutate();
              }
            }}
            disabled={deleteCompany.isPending}
          >
            {deleteCompany.isPending ? "Deleting..." : "Delete Company"}
          </Button>
        </div>
      </div>
    </div>
  );
}
