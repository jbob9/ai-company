import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  BarChart3,
  AlertCircle,
  Building2,
  Paperclip,
  Settings,
  SlidersHorizontal,
  Mic,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpcClient } from "@/utils/trpc";
import { useCompany } from "@/lib/company-context";
import { authClient } from "@/lib/auth-client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIHomeProps {
  activeDepartment?: string;
  onDepartmentChange?: (dept: string | undefined) => void;
}

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

export function AIHome({ activeDepartment, onDepartmentChange }: AIHomeProps) {
  const { company } = useCompany();
  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isInChat = messages.length > 0;
  const userName = session?.user?.name?.split(" ")[0] || "there";
  const agentLabel = activeDepartment
    ? deptLabels[activeDepartment] || "Department AI"
    : "Orchestrator";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setMessages([]);
    setConversationId(null);
  }, [activeDepartment]);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      return trpcClient.ai.chat.mutate({
        companyId: company?.id || "",
        departmentType: activeDepartment as Parameters<typeof trpcClient.ai.chat.mutate>[0]["departmentType"],
        conversationId: conversationId ?? undefined,
        message,
      });
    },
    onSuccess: (data) => {
      const isNewConversation = !conversationId;
      setConversationId(data.conversationId);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.content },
      ]);
      queryClient.invalidateQueries({ queryKey: ["ai", "listConversations"] });
      if (isNewConversation && data.conversationId && company?.id) {
        navigate(`/dashboard/${company.id}/chat/${data.conversationId}`);
      }
    },
  });

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || chatMutation.isPending) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    chatMutation.mutate(userMessage);

    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleQuickAction = (prompt: string) => {
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: prompt }]);
    chatMutation.mutate(prompt);
  };

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    target.style.height = "auto";
    target.style.height = Math.min(target.scrollHeight, 120) + "px";
  };

  const quickActions = [
    {
      icon: Sparkles,
      title: "Analyze company",
      desc: "Get a full health assessment across all departments",
      prompt: "Give me a comprehensive analysis of our company health across all departments. What are the key strengths, concerns, and recommended actions?",
    },
    {
      icon: Building2,
      title: "Department insights",
      desc: "Deep dive into any department's performance",
      prompt: "What department needs the most attention right now? Give me a breakdown of each department's status and any critical issues.",
    },
    {
      icon: AlertCircle,
      title: "Review alerts",
      desc: "Understand active alerts and recommended actions",
      prompt: "Are there any critical alerts or issues I should be aware of? What immediate actions do you recommend?",
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full min-w-0">
      {!isInChat ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pb-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4 sm:mb-6">
            <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2 text-center">
            Welcome, {userName}!
          </h1>
          <p className="text-muted-foreground text-sm sm:text-[15px] mb-6 sm:mb-10 text-center">
            How can I help you with{" "}
            <span className="font-medium text-foreground">
              {company?.name || "your company"}
            </span>{" "}
            today?
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-xl mb-8 sm:mb-10">
            {quickActions.map((action) => (
              <button
                key={action.title}
                onClick={() => handleQuickAction(action.prompt)}
                className="glass-panel rounded-2xl p-4 text-left hover:bg-foreground/4 transition-all group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/15 transition-colors">
                  <action.icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <h3 className="text-[13.5px] font-semibold mb-1">{action.title}</h3>
                <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                  {action.desc}
                </p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          <div className="max-w-2xl mx-auto space-y-4 sm:space-y-5">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex gap-2 sm:gap-3",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[90%] sm:max-w-[75%] rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "glass-panel"
                  )}
                >
                  <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>
                {message.role === "user" && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-foreground/10 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-foreground/70" />
                  </div>
                )}
              </div>
            ))}
            {chatMutation.isPending && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="glass-panel rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-primary/40 animate-pulse" />
                    <div className="w-2 h-2 rounded-full bg-primary/40 animate-pulse [animation-delay:150ms]" />
                    <div className="w-2 h-2 rounded-full bg-primary/40 animate-pulse [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      <div className="px-4 sm:px-6 pb-4 sm:pb-5 pt-2">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit}>
            <div className="glass-panel rounded-2xl overflow-hidden">
              <div className="flex items-end gap-2 p-3">
                <Sparkles className="h-4 w-4 text-primary/50 mb-2.5 shrink-0" />
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onInput={handleTextareaInput}
                  placeholder={"Ask " + agentLabel + " anything about your company..."}
                  disabled={chatMutation.isPending}
                  rows={1}
                  className="flex-1 resize-none bg-transparent text-[13.5px] placeholder:text-muted-foreground/50 focus:outline-none min-h-[36px] py-2 leading-snug"
                />
              </div>
              <div className="flex items-center justify-between px-3 pb-2.5 pt-0">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] text-muted-foreground hover:text-foreground rounded-lg hover:bg-foreground/4 transition-colors"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    Attach
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] text-muted-foreground hover:text-foreground rounded-lg hover:bg-foreground/4 transition-colors"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    Options
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/4 transition-colors"
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                  <button
                    type="submit"
                    disabled={!input.trim() || chatMutation.isPending}
                    className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
                      input.trim() && !chatMutation.isPending
                        ? "bg-primary text-primary-foreground hover:opacity-90"
                        : "bg-foreground/10 text-muted-foreground"
                    )}
                  >
                    {chatMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
