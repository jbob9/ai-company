import { useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";

import { trpcClient } from "@/utils/trpc";
import { useCompany } from "@/lib/company-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function NewCompanyPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectCompany } = useCompany();
  const [name, setName] = useState("");
  const [stage, setStage] = useState("bootstrap");
  const [industry, setIndustry] = useState("");

  const createCompany = useMutation({
    mutationFn: () =>
      trpcClient.company.create.mutate({
        name,
        stage: stage as "bootstrap" | "early" | "growth" | "scale",
        industry: industry || undefined,
      }),
    onSuccess: (company) => {
      queryClient.invalidateQueries({ queryKey: ["company"] });
      toast.success("Company created");
      if (company) {
        selectCompany(company.id);
        navigate("/dashboard/" + company.id);
      }
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a company name");
      return;
    }
    createCompany.mutate();
  };

  return (
    <div className="flex items-center justify-center h-full px-6">
      <div className="glass-panel rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Create Company</h1>
            <p className="text-[12px] text-muted-foreground">
              Set up your company for AI-powered insights
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-[12px]">
              Company Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Inc."
              required
              className="mt-1 glass-input rounded-lg border-0 h-9 text-[13px]"
            />
          </div>

          <div>
            <Label htmlFor="stage" className="text-[12px]">
              Company Stage
            </Label>
            <select
              id="stage"
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="w-full mt-1 glass-input rounded-lg h-9 px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
              <option value="bootstrap">Bootstrap (0-10 employees)</option>
              <option value="early">Early Stage (10-50 employees)</option>
              <option value="growth">Growth Stage (50-200 employees)</option>
              <option value="scale">Scale Stage (200+ employees)</option>
            </select>
          </div>

          <div>
            <Label htmlFor="industry" className="text-[12px]">
              Industry (optional)
            </Label>
            <Input
              id="industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="SaaS, E-commerce, Fintech..."
              className="mt-1 glass-input rounded-lg border-0 h-9 text-[13px]"
            />
          </div>

          <Button
            type="submit"
            className="w-full rounded-xl"
            disabled={createCompany.isPending}
          >
            {createCompany.isPending ? "Creating..." : "Create Company"}
          </Button>
        </form>
      </div>
    </div>
  );
}
