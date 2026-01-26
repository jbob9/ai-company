import { useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { trpcClient } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

export default function NewCompanyPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
      toast.success("Company created successfully");
      if (company) {
        navigate("/dashboard/" + company.id);
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
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
    <div className="flex items-center justify-center min-h-full">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Company</CardTitle>
          <CardDescription>
            Set up your company to start using AI-powered insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Inc."
                required
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
                <option value="bootstrap">Bootstrap (0-10 employees)</option>
                <option value="early">Early Stage (10-50 employees)</option>
                <option value="growth">Growth Stage (50-200 employees)</option>
                <option value="scale">Scale Stage (200+ employees)</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry (optional)</Label>
              <Input
                id="industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="SaaS, E-commerce, Fintech..."
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={createCompany.isPending}
            >
              {createCompany.isPending ? "Creating..." : "Create Company"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
