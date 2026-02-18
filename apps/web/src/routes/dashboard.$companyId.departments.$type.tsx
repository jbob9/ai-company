import { useState } from "react";
import { useParams, Link } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Package,
  Code,
  DollarSign,
  Megaphone,
  HeartHandshake,
  Calculator,
  Settings,
  Users,
  Scale,
  BarChart3,
  Building2,
  Shield,
  FileText,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Eye,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { trpc, trpcClient } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const deptIcons: Record<string, LucideIcon> = {
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

const categoryLabels: Record<string, string> = {
  role: "Role & Mission",
  kpis: "KPIs & Targets",
  monitoring: "Monitoring & Alerts",
  actions: "Actions & Playbooks",
  improvements: "Improvement Plan",
  general: "General",
};

const categoryOrder = ["role", "kpis", "monitoring", "actions", "improvements", "general"];

type DocumentRow = {
  id: string;
  departmentId: string;
  category: string;
  title: string;
  content: string;
  sortOrder: number;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export default function DepartmentDetailPage() {
  const { companyId, type } = useParams<{ companyId: string; type: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("role");
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [addingCategory, setAddingCategory] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");

  const { data: dept, isLoading: deptLoading } = useQuery({
    ...trpc.department.getByType.queryOptions({
      companyId: companyId!,
      type: type as any,
    }),
    enabled: !!companyId && !!type,
  });

  const { data: documents = [], isLoading: docsLoading } = useQuery({
    ...trpc.departmentDocument.list.queryOptions({
      departmentId: dept?.id ?? "",
    }),
    enabled: !!dept?.id,
  });

  const updateDoc = useMutation({
    mutationFn: (input: { id: string; title?: string; content?: string }) =>
      trpcClient.departmentDocument.update.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departmentDocument"] });
      setEditingDocId(null);
      toast.success("Document saved");
    },
    onError: (err) => toast.error(err.message),
  });

  const createDoc = useMutation({
    mutationFn: (input: {
      departmentId: string;
      category: string;
      title: string;
      content: string;
    }) =>
      trpcClient.departmentDocument.create.mutate({
        ...input,
        category: input.category as any,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departmentDocument"] });
      setAddingCategory(null);
      setNewTitle("");
      setNewContent("");
      toast.success("Document created");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteDoc = useMutation({
    mutationFn: (id: string) =>
      trpcClient.departmentDocument.delete.mutate({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departmentDocument"] });
      toast.success("Document deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  if (!companyId || !type) return null;

  const isLoading = deptLoading || docsLoading;
  const Icon = deptIcons[type] || Package;
  const basePath = `/dashboard/${companyId}/departments`;

  const docsByCategory = categoryOrder.reduce(
    (acc, cat) => {
      acc[cat] = documents.filter((d: DocumentRow) => d.category === cat);
      return acc;
    },
    {} as Record<string, DocumentRow[]>
  );

  const tabsWithDocs = categoryOrder.filter(
    (cat) => (docsByCategory[cat]?.length ?? 0) > 0 || cat === activeTab
  );
  if (!tabsWithDocs.includes(activeTab) && tabsWithDocs.length > 0) {
    setActiveTab(tabsWithDocs[0]);
  }

  const activeDocs = docsByCategory[activeTab] ?? [];

  function startEdit(doc: DocumentRow) {
    setEditingDocId(doc.id);
    setEditTitle(doc.title);
    setEditContent(doc.content);
    setShowPreview(false);
  }

  function cancelEdit() {
    setEditingDocId(null);
    setEditContent("");
    setEditTitle("");
  }

  function saveEdit() {
    if (!editingDocId) return;
    updateDoc.mutate({
      id: editingDocId,
      title: editTitle,
      content: editContent,
    });
  }

  function startAdd(category: string) {
    setAddingCategory(category);
    setNewTitle("");
    setNewContent("");
  }

  function saveNew() {
    if (!addingCategory || !dept) return;
    createDoc.mutate({
      departmentId: dept.id,
      category: addingCategory,
      title: newTitle || "Untitled",
      content: newContent,
    });
  }

  function handleDelete(docId: string) {
    if (confirm("Delete this document? This cannot be undone.")) {
      deleteDoc.mutate(docId);
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-5 w-5 bg-foreground/5 rounded animate-pulse" />
          <div className="h-6 w-40 bg-foreground/5 rounded animate-pulse" />
        </div>
        <div className="glass-panel rounded-xl p-6 animate-pulse">
          <div className="h-4 w-64 bg-foreground/5 rounded mb-3" />
          <div className="h-3 w-full bg-foreground/5 rounded mb-2" />
          <div className="h-3 w-3/4 bg-foreground/5 rounded" />
        </div>
      </div>
    );
  }

  if (!dept) {
    return (
      <div className="max-w-4xl mx-auto">
        <Link
          to={basePath}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to departments
        </Link>
        <div className="glass-panel rounded-xl p-12 text-center">
          <p className="text-muted-foreground">Department not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to={basePath}
          className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">{dept.name}</h1>
          <p className="text-[12px] text-muted-foreground capitalize">
            {type.replace(/_/g, " ")}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {dept.aiEnabled && (
            <span className="px-2 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded-full">
              AI Enabled
            </span>
          )}
          <span
            className={cn(
              "w-2.5 h-2.5 rounded-full",
              dept.isEnabled ? "bg-green-500" : "bg-muted-foreground/30"
            )}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
        {categoryOrder.map((cat) => {
          const count = docsByCategory[cat]?.length ?? 0;
          const isActive = activeTab === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveTab(cat)}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
              )}
            >
              {categoryLabels[cat]}
              {count > 0 && (
                <span className="ml-1.5 text-[10px] opacity-60">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Documents for active tab */}
      <div className="space-y-4">
        {activeDocs.map((doc: DocumentRow) => {
          const isEditing = editingDocId === doc.id;

          if (isEditing) {
            return (
              <div key={doc.id} className="glass-panel rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="flex-1 bg-transparent text-[14px] font-semibold focus:outline-none min-w-0"
                    placeholder="Document title"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      showPreview
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                    )}
                    title={showPreview ? "Hide preview" : "Show preview"}
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
                <div
                  className={cn(
                    "grid",
                    showPreview ? "md:grid-cols-2" : "grid-cols-1"
                  )}
                >
                  <div className="relative">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full min-h-[300px] p-4 bg-transparent text-[13px] font-mono leading-relaxed resize-y focus:outline-none"
                      placeholder="Write markdown content..."
                    />
                  </div>
                  {showPreview && (
                    <div className="border-l border-border/50 p-4 overflow-auto max-h-[500px]">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <Markdown remarkPlugins={[remarkGfm]}>
                          {editContent || "*No content yet*"}
                        </Markdown>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 rounded-lg"
                    onClick={cancelEdit}
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5 rounded-lg"
                    onClick={saveEdit}
                    disabled={updateDoc.isPending}
                  >
                    {updateDoc.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Save
                  </Button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={doc.id}
              className="glass-panel rounded-xl overflow-hidden"
            >
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <h3 className="text-[14px] font-semibold flex-1 truncate">
                  {doc.title}
                </h3>
                <button
                  type="button"
                  onClick={() => startEdit(doc)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
                  title="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(doc.id)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="p-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <Markdown remarkPlugins={[remarkGfm]}>
                    {doc.content || "*No content yet. Click edit to add content.*"}
                  </Markdown>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add new document form */}
        {addingCategory === activeTab ? (
          <div className="glass-panel rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="flex-1 bg-transparent text-[14px] font-semibold focus:outline-none min-w-0"
                placeholder="Document title"
                autoFocus
              />
            </div>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="w-full min-h-[200px] p-4 bg-transparent text-[13px] font-mono leading-relaxed resize-y focus:outline-none"
              placeholder="Write markdown content..."
            />
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border/50">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 rounded-lg"
                onClick={() => setAddingCategory(null)}
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
              <Button
                size="sm"
                className="gap-1.5 rounded-lg"
                onClick={saveNew}
                disabled={createDoc.isPending}
              >
                {createDoc.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Create
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => startAdd(activeTab)}
            className="w-full glass-panel rounded-xl p-4 flex items-center justify-center gap-2 text-[13px] text-muted-foreground hover:text-foreground hover:bg-foreground/3 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add {categoryLabels[activeTab]} document
          </button>
        )}
      </div>

      {/* Empty state when no docs at all */}
      {documents.length === 0 && !docsLoading && (
        <div className="glass-panel rounded-xl p-12 text-center mt-4">
          <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-1">
            No context documents yet
          </p>
          <p className="text-[12px] text-muted-foreground/60">
            Documents provide context that the AI agent uses to understand this
            department.
          </p>
        </div>
      )}
    </div>
  );
}
