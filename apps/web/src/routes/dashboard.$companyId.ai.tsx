import { useState } from "react";
import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";

import { trpc } from "@/utils/trpc";
import { ChatPanel } from "@/components/dashboard/chat-panel";
import { Button } from "@/components/ui/button";

const deptLabels: Record<string, string> = {
  product: "Product AI",
  engineering: "Engineering AI",
  sales: "Sales AI",
  marketing: "Marketing AI",
  customer_success: "Customer Success AI",
  finance: "Finance AI",
  operations: "Operations AI",
  hr: "HR AI",
};

export default function AIPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const [selectedDept, setSelectedDept] = useState<string | undefined>(undefined);

  const { data: departments = [] } = useQuery({
    ...trpc.department.list.queryOptions({ companyId: companyId! }),
    enabled: !!companyId,
  });

  if (!companyId) return <div>No company selected</div>;

  const enabledDepts = departments.filter((d) => d.isEnabled && d.aiEnabled);

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">AI Assistant</h1>
        <p className="text-muted-foreground">
          Chat with department AI agents or the company orchestrator
        </p>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <Button
          variant={selectedDept === undefined ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedDept(undefined)}
        >
          Orchestrator
        </Button>
        {enabledDepts.map((dept) => (
          <Button
            key={dept.type}
            variant={selectedDept === dept.type ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedDept(dept.type)}
          >
            {deptLabels[dept.type] || dept.name}
          </Button>
        ))}
      </div>

      <div className="flex-1 min-h-0">
        <ChatPanel
          key={selectedDept || "orchestrator"}
          companyId={companyId}
          departmentType={selectedDept}
          title={selectedDept ? deptLabels[selectedDept] : "Company Orchestrator"}
        />
      </div>
    </div>
  );
}
