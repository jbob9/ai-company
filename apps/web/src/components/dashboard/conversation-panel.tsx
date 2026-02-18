import { useQuery } from "@tanstack/react-query";
import { Search, MessageSquare, Plus, Bot } from "lucide-react";
import { useState } from "react";

import { trpc } from "@/utils/trpc";
import { useCompany } from "@/lib/company-context";
import { cn } from "@/lib/utils";

const deptLabels: Record<string, string> = {
  product: "Product",
  engineering: "Engineering",
  sales: "Sales",
  marketing: "Marketing",
  customer_success: "Customer Success",
  finance: "Finance",
  operations: "Operations",
  hr: "HR",
};

interface ConversationPanelProps {
  activeConversationId?: string | null;
  onSelectConversation?: (conversationId: string) => void;
  onNewChat?: () => void;
}

export function ConversationPanel({
  activeConversationId,
  onSelectConversation,
  onNewChat,
}: ConversationPanelProps) {
  const { company } = useCompany();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: conversations = [] } = useQuery({
    ...trpc.ai.listConversations.queryOptions({
      companyId: company?.id || "",
      limit: 30,
    }),
    enabled: !!company?.id,
  });

  const filtered = searchQuery
    ? conversations.filter(
        (c) =>
          c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.departmentType?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  function timeAgo(date: Date) {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + "m ago";
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + "h ago";
    const days = Math.floor(hours / 24);
    return days + "d ago";
  }

  return (
    <div className="w-[280px] flex flex-col h-full px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-[15px]">Chat history</h2>
        <button className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors">
          <MessageSquare className="h-4 w-4" />
        </button>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-9 pl-9 pr-3 rounded-lg glass-input text-[13px] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 -mx-1 px-1">
        {filtered.length > 0 ? (
          filtered.map((conversation) => {
            const isActive = conversation.id === activeConversationId;
            return (
              <button
                key={conversation.id}
                onClick={() => onSelectConversation?.(conversation.id)}
                className={cn(
                  "w-full text-left p-3 rounded-xl transition-colors group",
                  isActive
                    ? "bg-foreground/6"
                    : "hover:bg-foreground/3"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[13px] font-medium truncate leading-snug">
                    {conversation.title ||
                      (conversation.departmentType
                        ? deptLabels[conversation.departmentType] + " Chat"
                        : "Company Chat")}
                  </h3>
                  <span className="text-[10.5px] text-muted-foreground shrink-0 mt-0.5">
                    {timeAgo(conversation.updatedAt)}
                  </span>
                </div>
                {conversation.summary && (
                  <p className="text-[11.5px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                    {conversation.summary}
                  </p>
                )}
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center">
                    <Bot className="h-3 w-3 text-primary" />
                  </div>
                  {conversation.departmentType && (
                    <span className="text-[10px] text-muted-foreground bg-foreground/4 px-1.5 py-0.5 rounded">
                      {deptLabels[conversation.departmentType] || conversation.departmentType}
                    </span>
                  )}
                </div>
              </button>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-[12px] text-muted-foreground">
              {searchQuery ? "No matching chats" : "No conversations yet"}
            </p>
          </div>
        )}
      </div>

      <button
        onClick={onNewChat}
        className="mt-3 w-full h-10 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
      >
        <Plus className="h-4 w-4" />
        Create new chat
      </button>
    </div>
  );
}
