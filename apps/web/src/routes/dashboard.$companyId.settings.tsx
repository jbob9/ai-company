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
  const [aiKeyInputs, setAiKeyInputs] = useState<Record<string, string>>({
    gemini: "",
    openai: "",
    anthropic: "",
  });

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

  const { data: aiKeys } = useQuery({
    ...trpc.aiKeys.list.queryOptions(),
  });

  const upsertAIKey = useMutation({
    mutationFn: (variables: { provider: "gemini" | "openai" | "anthropic"; apiKey: string }) =>
      trpcClient.aiKeys.upsert.mutate(variables),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aiKeys", "list"] });
      toast.success("AI API key saved");
      setAiKeyInputs((prev) => ({ ...prev, [lastUpdatedProviderRef.current!]: "" }));
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteAIKey = useMutation({
    mutationFn: (provider: "gemini" | "openai" | "anthropic") =>
      trpcClient.aiKeys.delete.mutate({ provider }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aiKeys", "list"] });
      toast.success("AI API key removed");
    },
    onError: (error) => toast.error(error.message),
  });

  const lastUpdatedProviderRef = { current: "" as "gemini" | "openai" | "anthropic" | "" };

  const aiProviders: Array<{
    id: "gemini" | "openai" | "anthropic";
    label: string;
    description: string;
  }> = [
    {
      id: "gemini",
      label: "Google Gemini",
      description: "Fast and cost-effective models for analysis and chat.",
    },
    {
      id: "openai",
      label: "OpenAI",
      description: "GPT models for general-purpose reasoning and coding.",
    },
    {
      id: "anthropic",
      label: "Anthropic",
      description: "Claude models optimized for deep reasoning and safety.",
    },
  ];

  if (!companyId) return null;

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage company configuration and AI access
        </p>
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

        <div className="glass-panel rounded-xl p-5 space-y-4">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
            AI API Keys
          </h2>
          <p className="text-[12px] text-muted-foreground">
            Connect your own API keys for different AI providers. Keys are encrypted and used only
            server-side for your AI requests.
          </p>
          <div className="space-y-4">
            {aiProviders.map((provider) => {
              const summary = aiKeys?.find((k) => k.provider === provider.id);
              const configured = !!summary?.configured;
              return (
                <div
                  key={provider.id}
                  className="rounded-lg border border-border/60 px-3.5 py-3 flex flex-col gap-2 bg-background/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[13px] font-medium">
                        {provider.label}
                        {configured && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-500">
                            Configured
                          </span>
                        )}
                      </p>
                      <p className="text-[12px] text-muted-foreground">{provider.description}</p>
                    </div>
                    {configured && (
                      <Button
                        size="xs"
                        variant="ghost"
                        className="text-[11px]"
                        onClick={() => deleteAIKey.mutate(provider.id)}
                        disabled={deleteAIKey.isPending}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Input
                      type="password"
                      placeholder={`Paste ${provider.label} API key`}
                      value={aiKeyInputs[provider.id] ?? ""}
                      onChange={(e) =>
                        setAiKeyInputs((prev) => ({ ...prev, [provider.id]: e.target.value }))
                      }
                      className="glass-input rounded-lg border-0 h-9 text-[13px]"
                    />
                    <div className="flex justify-end">
                      <Button
                        size="xs"
                        className="rounded-xl"
                        disabled={!aiKeyInputs[provider.id] || upsertAIKey.isPending}
                        onClick={() => {
                          lastUpdatedProviderRef.current = provider.id;
                          upsertAIKey.mutate({
                            provider: provider.id,
                            apiKey: aiKeyInputs[provider.id]!,
                          });
                        }}
                      >
                        {upsertAIKey.isPending ? "Saving..." : configured ? "Update key" : "Save key"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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
